create or replace function public.register_image_for_block(
  p_block_id uuid,
  p_cloudinary_public_id text,
  p_format text,
  p_width integer,
  p_height integer,
  p_bytes integer
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_block_type content_block_type;
  v_content_id uuid;
  v_previous_media_id uuid;

  v_media_id uuid;
  v_existing_kind media_kind;
begin

  if not public.is_admin() then
    raise exception 'Not authorized'
      using errcode = '42501';
  end if;

  select
    type,
    content_id,
    media_id
  into
    v_block_type,
    v_content_id,
    v_previous_media_id
  from public.content_block
  where id = p_block_id;

  if not found then
    raise exception 'Block not found'
      using errcode = 'P0002';
  end if;

  if v_block_type <> 'image' then
    raise exception 'Block is not an image block'
      using errcode = 'P0001';
  end if;

  if btrim(
    coalesce(
      p_cloudinary_public_id,
      ''
    )
  ) = '' then
    raise exception 'Cloudinary public id is required'
      using errcode = '22023';
  end if;

  if p_width is null or p_width <= 0 then
    raise exception 'Image width is invalid'
      using errcode = '22023';
  end if;

  if p_height is null or p_height <= 0 then
    raise exception 'Image height is invalid'
      using errcode = '22023';
  end if;

  if p_bytes is null or p_bytes <= 0 then
    raise exception 'Image bytes are invalid'
      using errcode = '22023';
  end if;

  -- Si la misma subida se registra dos veces,
  -- reutilizamos el media_asset ya existente.
  select
    id,
    kind
  into
    v_media_id,
    v_existing_kind
  from public.media_asset
  where cloudinary_public_id =
    p_cloudinary_public_id;

  if found then

    if v_existing_kind <> 'image' then
      raise exception 'Existing media is not an image'
        using errcode = 'P0001';
    end if;

    update public.media_asset
    set
      format = nullif(
        btrim(p_format),
        ''
      ),
      width = p_width,
      height = p_height,
      bytes = p_bytes,
      status = 'ready'
    where id = v_media_id;

  else

    insert into public.media_asset (
      kind,
      cloudinary_public_id,
      format,
      width,
      height,
      duration_seconds,
      bytes,
      status
    )
    values (
      'image',
      p_cloudinary_public_id,
      nullif(
        btrim(p_format),
        ''
      ),
      p_width,
      p_height,
      null,
      p_bytes,
      'ready'
    )
    returning id
    into v_media_id;

  end if;

  update public.content_block
  set media_id = v_media_id
  where id = p_block_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    payload
  )
  values (
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        'unknown'
      )
    ),
    'attach_image',
    'media_asset',
    v_media_id,
    jsonb_build_object(
      'content_id',
      v_content_id,
      'block_id',
      p_block_id,
      'cloudinary_public_id',
      p_cloudinary_public_id,
      'previous_media_id',
      v_previous_media_id
    )
  );

  return v_media_id;

end;
$$;

revoke all
on function public.register_image_for_block(
  uuid,
  text,
  text,
  integer,
  integer,
  integer
)
from public;

grant execute
on function public.register_image_for_block(
  uuid,
  text,
  text,
  integer,
  integer,
  integer
)
to authenticated;