import { getData, setData, STORAGE_KEYS } from './data.js';
import { showModal, closeModal } from './modales.js';
import { renderProductos } from './productos.js';
import { renderDashboard } from './dashboard.js';

export function renderVentas() {
  const tbody = document.querySelector("#tablaVentas tbody");
  const ventas = getData("ventas");
  tbody.innerHTML = "";
  for(let v of ventas) {
    tbody.innerHTML += `<tr>
      <td>${v.idFactura}</td>
      <td>${v.clienteNombre}</td>
      <td>${(new Date(v.fecha)).toLocaleDateString()}</td>
      <td>$${v.totalCostoVenta.toFixed(2)}</td>
      <td>
        <button onclick="window.verFactura('${v.id}')">🧾 Ver</button>
        <button onclick="window.descargarFactura('${v.id}')">PDF</button>
        <button onclick="window.borrarVenta('${v.id}')" style="background:#fff0f0;color:#b90015;">🗑️ Borrar</button>
      </td>
    </tr>`;
  }
}

export function setupVentasModalHooks() {
  document.getElementById("btnNuevaVenta").onclick = window.nuevaVentaModal = nuevaVentaModal;
}

window.borrarVenta = function(id){
  if(!confirm("¿Seguro que desea borrar esta venta? Esta acción es irreversible.")) return;
  let ventas = getData("ventas");
  let venta = ventas.find(v => v.id === id);
  if (!venta) return;

  let productos = getData("productos");
  for (let dt of venta.detalles) {
    let ix = productos.findIndex(p => p.id === dt.id);
    if (ix >= 0) {
      productos[ix].stock += dt.cantidad;
    }
  }
  setData("productos", productos);

  ventas = ventas.filter(v => v.id !== id);
  setData("ventas", ventas);

  let clientes = getData("clientes");
  let cliente = clientes.find(c => c.id === venta.clienteId);
  if (cliente && cliente.historial) {
    cliente.historial = cliente.historial.filter(h => !(h.fecha === venta.fecha && h.total === venta.totalCostoVenta));
    let cliIx = clientes.findIndex(c => c.id === venta.clienteId);
    clientes[cliIx] = cliente;
    setData("clientes", clientes);
  }

  renderVentas();
  renderProductos();
  renderDashboard();
};

function nuevaVentaModal(){
  const productos = getData("productos");
  const clientes = getData("clientes");
  if(productos.length==0) {
    alert("Primero registre al menos un producto.");
    return;
  }
  showModal(`
    <h3>Nueva Venta</h3>
    <form id="formVenta">
      <div class="form-group">
        <label>Cliente</label>
        <select name="clienteId" required>
          <option value="">--Seleccionar--</option>
          ${clientes.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Productos y Cantidad</label>
        <div id="prodVentaCampos">
          ${productos.map(prod=>`
            <label>
              <input type="number" name="p_${prod.id}" min="0" max="${prod.stock}" value="0" style="width:45px;">
              ${prod.nombre} (${prod.categoria}) - Stock: ${prod.stock}
            </label><br>`).join('')}
        </div>
      </div>
      <div style="text-align:right;">
        <button type="button" onclick="window.closeModal()">Cancelar</button>
        <button type="submit">Facturar</button>
      </div>
    </form>
  `);

  document.getElementById('formVenta').onsubmit = function(ev){
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(this).entries());
    const clienteId = datos.clienteId;
    if(!clienteId) return alert("Seleccione cliente.");
    let detalles=[];
    let total = 0; let totalCompra=0; let prodDesc = [];
    let productos = getData("productos");

    for(let k in datos) {
      if(k.startsWith("p_") && +datos[k]>0) {
        let prod = productos.find(p => p.id === k.slice(2));
        let precio = prod.precio;
        let textoPromo = "";
        if(prod.promoActiva) {
          if(prod.promocionTipo==="porcentaje") {
            precio -= precio * prod.promocionCantidad / 100;
            textoPromo = ` (-${prod.promocionCantidad}%)`;
          } else {
            precio -= prod.promocionCantidad;
            textoPromo = ` (-$${prod.promocionCantidad})`;
          }
        }
        let cantidad = +datos[k];
        if (cantidad > prod.stock) {
          alert(`Stock insuficiente para ${prod.nombre}`);
          return;
        }
        detalles.push({
          id: prod.id,
          nombre: prod.nombre,
          cantidad,
          precioFinal: precio,
          subtotal: precio * cantidad,
        });
        total += precio * cantidad;
        totalCompra += prod.costoCompra * cantidad;
        prod.stock -= cantidad;
        prodDesc.push(prod.nombre + " x" + cantidad + textoPromo);
      }
    }

    if(detalles.length === 0) return alert("Debe seleccionar al menos un producto.");
    setData("productos", productos);

    const clientes = getData("clientes");
    const cliente = clientes.find(c => c.id === clienteId);
    const venta = {
      id: crypto.randomUUID(),
      idFactura: "FAC-" + Date.now(),
      clienteId,
      clienteNombre: cliente.nombre,
      fecha: new Date().toISOString(),
      detalles,
      totalCostoVenta: total,
      totalCostoCompra: totalCompra,
    };

    let ventas = getData("ventas");
    ventas.push(venta);
    setData("ventas", ventas);

    cliente.historial = cliente.historial || [];
    cliente.historial.push({
      fecha: venta.fecha,
      total,
      productos: prodDesc
    });
    let cliIx = clientes.findIndex(c => c.id === clienteId);
    clientes[cliIx] = cliente;
    setData("clientes", clientes);

    window.closeModal();
    renderVentas();
    renderProductos();
    renderDashboard();
  };
}
