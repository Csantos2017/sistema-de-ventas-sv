import { getData } from './data.js';

export function iniciarAsistente() {
  const chat = document.getElementById("chatAsistente");
  chat.innerHTML = "<p><strong>Asistente:</strong> ¡Hola! ¿En qué puedo ayudarte hoy?</p>";

  const respuestaAutomatica = generarRespuesta();
  if (respuestaAutomatica) {
    setTimeout(() => {
      chat.innerHTML += `<p><strong>Asistente:</strong> ${respuestaAutomatica}</p>`;
      chat.scrollTop = chat.scrollHeight;
    }, 1200);
  }
}

function generarRespuesta() {
  const productos = getData("productos");
  const ventas = getData("ventas");
  let alertas = [];

  // Productos por agotarse
  const criticos = productos.filter(p => p.stock <= p.critico);
  if (criticos.length > 0) {
    alertas.push(`Tienes ${criticos.length} productos por agotarse. Ej: ${criticos[0].nombre}`);
  }

  // Producto más vendido
  let counts = {};
  ventas.forEach(v => v.detalles.forEach(dt => {
    counts[dt.nombre] = (counts[dt.nombre] || 0) + dt.cantidad;
  }));
  let masVendidos = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (masVendidos.length > 0) {
    alertas.push(`El producto más vendido este mes es: ${masVendidos[0][0]} (${masVendidos[0][1]} ventas)`);
  }

  // Productos sin movimiento
  const vendidos = masVendidos.map(m => m[0]);
  const sinMovimiento = productos.filter(p => !vendidos.includes(p.nombre));
  if (sinMovimiento.length > 0) {
    alertas.push(`Tienes productos sin ventas: ${sinMovimiento.slice(0, 2).map(p => p.nombre).join(", ")}`);
  }

  // Recomendación general
  if (alertas.length === 0) {
    return "Todo está bajo control. ¡Sigue así!";
  }
  return alertas.join(" · ");
}
