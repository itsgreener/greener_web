#!/usr/bin/env bash
# Compara, registro a registro, lo que responden dos servidores de nombres.
# Sirve para comprobar, ANTES de cambiar los NS en el registrador, que la zona
# importada en Cloudflare responde igual que la de Dinahosting.
#
# Uso:
#   scripts/dns-compare.sh docs/operaciones/dns-d1-zona-a-importar.zone \
#       ns.dinahosting.com <ns-asignado-por-cloudflare>
#
# Los NS de Cloudflare salen en el panel al añadir la zona (formato xxx.ns.cloudflare.com).
# Salida: una línea OK o DIFF por nombre y tipo; en caso de DIFF, lo que dice cada servidor.
# Código de salida: 0 si todo coincide, 1 si hay diferencias, 2 si falta algún argumento.
set -u

zone="${1:-}"
ns_a="${2:-}"
ns_b="${3:-}"
domain="${DNS_DOMAIN:-itsgreener.com}"

if [ -z "$zone" ] || [ -z "$ns_a" ] || [ -z "$ns_b" ]; then
  echo "Uso: $0 <fichero.zone> <ns-origen> <ns-destino>" >&2
  exit 2
fi

status=0
checked=0

# Nombre y tipo de cada registro (se ignoran comentarios y directivas $).
while read -r name type; do
  if [ "$name" = "@" ]; then
    fqdn="$domain"
  else
    fqdn="$name.$domain"
  fi
  answer_a="$(dig +short +time=3 +tries=2 "@$ns_a" "$fqdn" "$type" | sort)"
  answer_b="$(dig +short +time=3 +tries=2 "@$ns_b" "$fqdn" "$type" | sort)"
  checked=$((checked + 1))
  if [ "$answer_a" = "$answer_b" ]; then
    echo "OK   $type $fqdn"
  else
    status=1
    echo "DIFF $type $fqdn"
    echo "  $ns_a: ${answer_a:-<vacío>}"
    echo "  $ns_b: ${answer_b:-<vacío>}"
  fi
done < <(awk '!/^[;$]/ && NF >= 4 { print $1, $4 }' "$zone" | sort -u)

echo "Comprobados: $checked nombres/tipos"
exit "$status"
