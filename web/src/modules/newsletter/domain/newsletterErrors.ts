/**
 * El proveedor de la newsletter marcó la dirección como no entregable: no se
 * puede volver a suscribir. La aplicación lo distingue de un fallo del
 * proveedor para pedir otro email en lugar de decir «inténtalo más tarde».
 */
export class UndeliverableEmailError extends Error {
  constructor() {
    super('This email cannot be subscribed because it is undeliverable.')

    this.name = 'UndeliverableEmailError'
  }
}
