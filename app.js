
"use strict";

/* =========================================================
   FOODLY
   Frontend: http://127.0.0.1:5500/src/usuarios/public/
   Backend:  http://localhost:3000
   ========================================================= */

const API_URL = "http://localhost:3000";

const STORAGE = {
    token: "foodlyToken",
    usuario: "foodlyUsuario",
    guardados: "foodlyGuardados"
};

let restaurantes = [];
let productos = [];
let restauranteSeleccionado = null;
let categoriaSeleccionada = "todos";
let busqueda = "";
let ubicacionSeleccionada = "Medellín, Antioquia";
let seccionAnteriorDetalle = "inicio";

const $ = (id) => document.getElementById(id);

/* =========================================================
   UTILIDADES
   ========================================================= */

function leerStorage(clave, defecto) {
    try {
        const valor = localStorage.getItem(clave);
        return valor ? JSON.parse(valor) : defecto;
    } catch {
        return defecto;
    }
}

function guardarStorage(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
        mostrarMensaje("No fue posible guardar los datos en este navegador.", "error");
    }
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, letra => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[letra]);
}

function mostrarMensaje(mensaje, tipo = "info") {
    let elemento = $("mensaje-foodly");

    if (!elemento) {
        elemento = document.createElement("div");
        elemento.id = "mensaje-foodly";

        Object.assign(elemento.style, {
            position: "fixed",
            left: "50%",
            bottom: "20px",
            transform: "translateX(-50%)",
            zIndex: "100000",
            width: "max-content",
            maxWidth: "90%",
            padding: "13px 18px",
            borderRadius: "10px",
            color: "#fff",
            background: "#222",
            fontSize: "14px",
            textAlign: "center"
        });

        document.body.appendChild(elemento);
    }

    elemento.style.background = tipo === "error"
        ? "#a52a2a"
        : tipo === "exito"
            ? "#237a43"
            : "#222";

    elemento.textContent = mensaje;
    elemento.hidden = false;

    clearTimeout(mostrarMensaje.temporizador);

    mostrarMensaje.temporizador = setTimeout(() => {
        elemento.hidden = true;
    }, 4500);
}

async function pedirAPI(ruta, opciones = {}) {
    const token = localStorage.getItem(STORAGE.token);

    const headers = {
        ...(opciones.body ? { "Content-Type": "application/json" } : {}),
        ...(opciones.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let respuesta;

    try {
        respuesta = await fetch(`${API_URL}${ruta}`, {
            ...opciones,
            headers
        });
    } catch {
        throw new Error(
            "No se pudo conectar con NestJS. Comprueba que el backend siga ejecutándose en localhost:3000."
        );
    }

    const texto = await respuesta.text();
    let datos = null;

    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = texto;
        }
    }

    if (!respuesta.ok) {
        let mensaje = typeof datos === "object" && datos
            ? datos.message || datos.error
            : datos;

        if (Array.isArray(mensaje)) {
            mensaje = mensaje.join(". ");
        }

        throw new Error(
            mensaje || `La solicitud falló (HTTP ${respuesta.status}).`
        );
    }

    return datos;
}

function extraerLista(datos, claves = []) {
    if (Array.isArray(datos)) return datos;
    if (!datos || typeof datos !== "object") return [];

    for (const clave of claves) {
        if (Array.isArray(datos[clave])) return datos[clave];
    }

    return Array.isArray(datos.data) ? datos.data : [];
}

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function obtenerTokenTurnstile(formulario) {
    return formulario
        ?.querySelector('[name="cf-turnstile-response"]')
        ?.value?.trim() || "";
}

/* =========================================================
   ACCESO A LOS DATOS
   ========================================================= */

function idRestaurante(restaurante) {
    return restaurante?.id_establecimiento
        ?? restaurante?.id
        ?? restaurante?.establecimientoId
        ?? restaurante?.establecimiento_id
        ?? null;
}

function nombreRestaurante(restaurante) {
    return restaurante?.nombre
        ?? restaurante?.nombre_establecimiento
        ?? restaurante?.nombre_comercial
        ?? "Restaurante";
}

function descripcionRestaurante(restaurante) {
    return restaurante?.descripcion
        ?? "Conoce esta propuesta gastronómica.";
}

function ubicacionRestaurante(restaurante) {
    return restaurante?.ubicacion
        ?? restaurante?.direccion
        ?? restaurante?.barrio
        ?? restaurante?.zona
        ?? restaurante?.ciudad
        ?? "Ubicación no disponible";
}

function imagenRestaurante(restaurante) {
    return restaurante?.imagen_url
        ?? restaurante?.imagenUrl
        ?? restaurante?.imagen
        ?? restaurante?.foto
        ?? restaurante?.url_imagen
        ?? "";
}

function tipoComidaRestaurante(restaurante) {
    return restaurante?.tipo_comida
        ?? restaurante?.tipoComida
        ?? restaurante?.categoria_nombre
        ?? restaurante?.categoria?.nombre
        ?? restaurante?.categoria
        ?? "Gastronomía";
}

function obtenerGuardados() {
    const valor = leerStorage(STORAGE.guardados, []);
    return Array.isArray(valor) ? valor : [];
}

function estaGuardado(restaurante) {
    const id = idRestaurante(restaurante);

    return id !== null && obtenerGuardados().some(
        guardado => String(guardado) === String(id)
    );
}

/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function mostrarPantalla(idPantalla) {
    [
        "pantalla-bienvenida",
        "pantalla-login",
        "pantalla-registro",
        "pantalla-home"
    ].forEach(id => {
        const elemento = $(id);
        if (!elemento) return;

        const activa = id === idPantalla;
        elemento.classList.toggle("oculto", !activa);
        elemento.hidden = !activa;
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function mostrarSeccion(nombre) {
    const mapa = {
        inicio: "seccion-inicio",
        home: "seccion-inicio",
        explorar: "seccion-explorar",
        restaurantes: "seccion-restaurantes",
        guardados: "seccion-guardados",
        perfil: "seccion-perfil"
    };

    const objetivo = mapa[nombre];

    if (!objetivo) {
        console.warn("Sección no reconocida:", nombre);
        return;
    }

    seccionAnteriorDetalle = nombre === "home" ? "inicio" : nombre;

    document.querySelectorAll(".seccion-home").forEach(seccion => {
        seccion.classList.add("oculto");
        seccion.hidden = true;
    });

    const seccion = $(objetivo);

    if (seccion) {
        seccion.classList.remove("oculto");
        seccion.hidden = false;
    }

    if (nombre === "guardados") renderizarGuardados();
    if (nombre === "perfil") actualizarPerfil();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function entrarDirectamente() {
    mostrarPantalla("pantalla-home");
    mostrarSeccion("inicio");
    cargarDatos();
}

function cerrarSesion() {
    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.usuario);

    mostrarPantalla("pantalla-bienvenida");
    mostrarMensaje("Has cerrado sesión correctamente.", "exito");
}

/* =========================================================
   INICIO DE SESIÓN
   ========================================================= */

async function iniciarSesion(evento) {
    evento?.preventDefault();

    const formulario = $("formulario-login")
        || $("correo-login")?.closest("form");

    const correo = $("correo-login")?.value.trim();
    const contrasena = $("contrasena-login")?.value;
    const turnstileToken = obtenerTokenTurnstile(formulario);

    if (!correo || !contrasena) {
        mostrarMensaje("Escribe tu correo y contraseña.", "error");
        return;
    }

    if (!turnstileToken) {
        mostrarMensaje("Completa la verificación CAPTCHA antes de iniciar sesión.", "error");
        return;
    }

    const boton = formulario?.querySelector('button[type="submit"]');

    if (boton) boton.disabled = true;

    try {
        const respuesta = await pedirAPI("/usuarios/login", {
            method: "POST",
            body: JSON.stringify({
                correo,
                contrasena,
                turnstileToken
            })
        });

        const token = respuesta?.access_token;

        if (!token) {
            throw new Error("El servidor no devolvió el token de acceso esperado.");
        }

        localStorage.setItem(STORAGE.token, token);

        const usuario = respuesta?.usuario ?? {
            correo,
            nombre: correo.split("@")[0]
        };

        guardarStorage(STORAGE.usuario, usuario);

        mostrarPantalla("pantalla-home");
        mostrarSeccion("inicio");
        actualizarPerfil();

        await cargarDatos();

        mostrarMensaje("¡Bienvenido a Foodly!", "exito");
    } catch (error) {
        mostrarMensaje(error.message, "error");
    } finally {
        if (boton) boton.disabled = false;
    }
}

/* =========================================================
   REGISTRO
   ========================================================= */

async function registrarUsuario(evento) {
    evento?.preventDefault();

    const formulario = $("formulario-registro");

    const nombre = $("nombre")?.value.trim();
    const apellido = $("apellido")?.value.trim();
    const cedula = $("cedula")?.value.trim();
    const correo = $("correo-registro")?.value.trim();
    const contrasena = $("contrasena-registro")?.value;
    const turnstileToken = obtenerTokenTurnstile(formulario);

    if (!nombre || !apellido || !cedula || !correo || !contrasena) {
        mostrarMensaje("Completa todos los campos del registro.", "error");
        return;
    }

    if (!turnstileToken) {
        mostrarMensaje("Completa la verificación CAPTCHA antes de registrarte.", "error");
        return;
    }

    const boton = formulario?.querySelector('button[type="submit"]');

    if (boton) boton.disabled = true;

    try {
        await pedirAPI("/usuarios", {
            method: "POST",
            body: JSON.stringify({
                nombre,
                apellido,
                cedula,
                correo,
                contrasena,
                turnstileToken
            })
        });

        mostrarMensaje(
            "Cuenta registrada. Ahora puedes iniciar sesión.",
            "exito"
        );

        formulario?.reset();
        mostrarPantalla("pantalla-login");
    } catch (error) {
        mostrarMensaje(`No fue posible completar el registro: ${error.message}`, "error");
    } finally {
        if (boton) boton.disabled = false;
    }
}

/* =========================================================
   CARGA DE RESTAURANTES Y PRODUCTOS
   ========================================================= */

async function cargarDatos() {
    await Promise.allSettled([
        cargarRestaurantes(),
        cargarProductos()
    ]);

    renderizarTodo();
}

async function cargarRestaurantes() {
    try {
        const respuesta = await pedirAPI("/establecimientos");

        restaurantes = extraerLista(respuesta, [
            "establecimientos",
            "restaurantes",
            "items"
        ]);
    } catch (error) {
        console.error("Error cargando establecimientos:", error);
        restaurantes = [];
        mostrarMensaje(error.message, "error");
    }
}

async function cargarProductos() {
    try {
        const respuesta = await pedirAPI("/productos");

        productos = extraerLista(respuesta, [
            "productos",
            "items"
        ]);
    } catch (error) {
        console.error("Error cargando productos:", error);
        productos = [];
    }
}

function renderizarTodo() {
    renderizarRestaurantes();
    renderizarExplorar();
    renderizarListaRestaurantes();
    renderizarGuardados();
}

/* =========================================================
   BÚSQUEDA Y CATEGORÍAS
   ========================================================= */

function textoProductosRestaurante(restaurante) {
    const id = idRestaurante(restaurante);

    return productos
        .filter(producto => {
            const idProducto = producto.id_establecimiento
                ?? producto.establecimiento?.id_establecimiento
                ?? producto.establecimiento?.id;

            return id !== null && String(idProducto) === String(id);
        })
        .filter(producto => producto.disponible === undefined
            || Number(producto.disponible) === 1)
        .map(producto => [
            producto.nombre,
            producto.descripcion,
            producto.categoria?.nombre,
            producto.categoria?.descripcion
        ].join(" "))
        .join(" ");
}

function coincideBusqueda(restaurante) {
    const texto = normalizar([
        nombreRestaurante(restaurante),
        descripcionRestaurante(restaurante),
        ubicacionRestaurante(restaurante),
        tipoComidaRestaurante(restaurante),
        textoProductosRestaurante(restaurante)
    ].join(" "));

    const textoBuscado = normalizar(busqueda);
    const coincideTexto = !textoBuscado || texto.includes(textoBuscado);

    const categoria = normalizar(categoriaSeleccionada);

    const coincideCategoria = categoria === "todos"
        || texto.includes(categoria)
        || (categoria === "paisa" && texto.includes("tipica"))
        || (categoria === "hamburguesas" && texto.includes("burger"))
        || (categoria === "mexicana" && texto.includes("taco"));

    return coincideTexto && coincideCategoria;
}

function filtrarLista(lista) {
    return lista.filter(coincideBusqueda);
}

function renderizarRestaurantes() {
    const contenedor = $("contenedor-restaurantes");
    renderizarEnContenedor(contenedor, filtrarLista(restaurantes));
}

function renderizarExplorar() {
    renderizarEnContenedor(
        $("resultados-explorar"),
        filtrarLista(restaurantes)
    );
}

function renderizarListaRestaurantes() {
    renderizarEnContenedor(
        $("lista-restaurantes"),
        filtrarLista(restaurantes)
    );
}

function buscarRestaurantes(evento) {
    evento?.preventDefault();

    busqueda = $("busqueda")?.value.trim() || "";

    renderizarTodo();
}

function buscarDesdeExplorar(evento) {
    evento?.preventDefault();

    busqueda = $("busqueda-explorar")?.value.trim() || "";

    if ($("busqueda")) {
        $("busqueda").value = busqueda;
    }

    renderizarTodo();
}

function filtrarCategoria(categoria, boton) {
    categoriaSeleccionada = normalizar(categoria || "todos");

    if (categoriaSeleccionada.includes("todo")) {
        categoriaSeleccionada = "todos";
    }

    document.querySelectorAll(".categoria").forEach(elemento => {
        const valor = normalizar(elemento.textContent);

        const activa = elemento === boton
            || (!boton && valor === categoriaSeleccionada)
            || (categoriaSeleccionada === "todos" && valor === "todos");

        elemento.classList.toggle("activa", activa);
        elemento.classList.toggle("categoria-activa", activa);
    });

    renderizarTodo();
}

function cambiarUbicacion() {
    const nuevaUbicacion = window.prompt(
        "Escribe la ciudad, barrio o zona que quieres consultar:",
        ubicacionSeleccionada
    );

    if (nuevaUbicacion === null || !nuevaUbicacion.trim()) {
        return;
    }

    ubicacionSeleccionada = nuevaUbicacion.trim();

    if ($("ubicacion-actual")) {
        $("ubicacion-actual").textContent = ubicacionSeleccionada;
    }

    if ($("busqueda")) {
        $("busqueda").value = ubicacionSeleccionada;
    }

    busqueda = ubicacionSeleccionada;

    renderizarTodo();

    mostrarMensaje(
        "Se filtraron los restaurantes por el texto de ubicación. Los resultados dependen de las direcciones disponibles.",
        "info"
    );
}

/* =========================================================
   TARJETAS
   ========================================================= */

function crearTarjetaRestaurante(restaurante) {
    const id = idRestaurante(restaurante);
    const nombre = escaparHTML(nombreRestaurante(restaurante));
    const descripcion = escaparHTML(descripcionRestaurante(restaurante));
    const ubicacion = escaparHTML(ubicacionRestaurante(restaurante));
    const tipo = escaparHTML(tipoComidaRestaurante(restaurante));
    const imagen = imagenRestaurante(restaurante);
    const guardado = estaGuardado(restaurante);

    const tarjeta = document.createElement("article");
    tarjeta.className = "post-restaurante restaurante";
    tarjeta.dataset.id = id ?? "";

    const imagenSegura = /^https?:\/\//i.test(imagen)
        || imagen.startsWith("/")
        || imagen.startsWith("./")
        ? escaparHTML(imagen)
        : "";

    tarjeta.innerHTML = `
        <div class="imagen-restaurante">
            ${
                imagenSegura
                    ? `<img src="${imagenSegura}" alt="${nombre}" loading="lazy">`
                    : `<div class="imagen-placeholder" role="img" aria-label="Imagen no disponible">🍽️</div>`
            }
        </div>

        <div class="informacion-restaurante">
            <p class="categoria-restaurante">${tipo}</p>
            <h3>${nombre}</h3>
            <p>${descripcion}</p>
            <p class="ubicacion-restaurante">📍 ${ubicacion}</p>

            <div class="acciones-restaurante">
                <button type="button" data-accion="ver"
                    data-id="${escaparHTML(id ?? "")}">
                    Ver restaurante
                </button>

                <button type="button" data-accion="guardar"
                    data-id="${escaparHTML(id ?? "")}">
                    ${guardado ? "♥ Guardado" : "♡ Guardar"}
                </button>
            </div>
        </div>
    `;

    const img = tarjeta.querySelector("img");

    img?.addEventListener("error", () => {
        const placeholder = document.createElement("div");
        placeholder.className = "imagen-placeholder";
        placeholder.textContent = "🍽️";
        img.replaceWith(placeholder);
    });

    return tarjeta;
}

function renderizarEnContenedor(contenedor, lista) {
    if (!contenedor) return;

    contenedor.replaceChildren();

    if (!lista.length) {
        const mensaje = document.createElement("p");
        mensaje.className = "mensaje-vacio";
        mensaje.textContent = restaurantes.length
            ? "No encontramos restaurantes con esos filtros."
            : "Todavía no hay restaurantes disponibles para mostrar.";

        contenedor.appendChild(mensaje);
        return;
    }

    lista.forEach(restaurante => {
        contenedor.appendChild(crearTarjetaRestaurante(restaurante));
    });
}

/* =========================================================
   GUARDADOS
   ========================================================= */

function guardarRestaurante(id) {
    if (id === null || id === undefined || id === "") {
        mostrarMensaje("Este restaurante no tiene identificador.", "error");
        return;
    }

    let guardados = obtenerGuardados();

    const existe = guardados.some(
        valor => String(valor) === String(id)
    );

    if (existe) {
        guardados = guardados.filter(
            valor => String(valor) !== String(id)
        );

        mostrarMensaje("Restaurante eliminado de guardados.");
    } else {
        guardados.push(id);
        mostrarMensaje("Restaurante guardado.", "exito");
    }

    guardarStorage(STORAGE.guardados, guardados);
    renderizarTodo();
    actualizarBotonGuardarDetalle();
}

function renderizarGuardados() {
    const ids = obtenerGuardados();

    const lista = restaurantes.filter(restaurante =>
        ids.some(id => String(id) === String(idRestaurante(restaurante)))
    );

    renderizarEnContenedor($("lista-guardados"), lista);
}

/* =========================================================
   DETALLE
   ========================================================= */

function verRestaurante(id) {
    restauranteSeleccionado = restaurantes.find(
        restaurante => String(idRestaurante(restaurante)) === String(id)
    );

    if (!restauranteSeleccionado) {
        mostrarMensaje("No encontramos ese restaurante.", "error");
        return;
    }

    const restaurante = restauranteSeleccionado;
    const imagen = imagenRestaurante(restaurante);
    const icono = $("detalle-icono");

    if (icono) {
        icono.replaceChildren();

        if (imagen && (/^https?:\/\//i.test(imagen) || imagen.startsWith("/"))) {
            const img = document.createElement("img");
            img.src = imagen;
            img.alt = nombreRestaurante(restaurante);

            img.addEventListener("error", () => {
                icono.textContent = "🍽️";
            });

            icono.appendChild(img);
        } else {
            icono.textContent = "🍽️";
        }
    }

    if ($("detalle-nombre")) {
        $("detalle-nombre").textContent = nombreRestaurante(restaurante);
    }

    if ($("detalle-descripcion")) {
        $("detalle-descripcion").textContent = descripcionRestaurante(restaurante);
    }

    if ($("detalle-ubicacion")) {
        $("detalle-ubicacion").textContent = ubicacionRestaurante(restaurante);
    }

    if ($("detalle-calificacion")) {
        const calificacion = restaurante.calificacion
            ?? restaurante.promedio_calificacion;

        $("detalle-calificacion").textContent =
            calificacion !== undefined && calificacion !== null
                ? `⭐ ${calificacion}`
                : "Calificación no disponible";
    }

    if ($("detalle-telefono")) {
        $("detalle-telefono").textContent =
            restaurante.telefono ?? "Contacto no disponible";
    }

    if ($("detalle-tipo-comida")) {
        $("detalle-tipo-comida").textContent = tipoComidaRestaurante(restaurante);
    }

    seccionAnteriorDetalle = document.querySelector(
        ".seccion-home:not(.oculto):not(#detalle-restaurante)"
    )?.id?.replace("seccion-", "") || "inicio";

    document.querySelectorAll(".seccion-home").forEach(seccion => {
        seccion.classList.add("oculto");
        seccion.hidden = true;
    });

    const detalle = $("detalle-restaurante");

    if (detalle) {
        detalle.classList.remove("oculto");
        detalle.hidden = false;
    }

    actualizarBotonGuardarDetalle();
    renderizarProductosDetalle();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function actualizarBotonGuardarDetalle() {
    const boton = $("boton-guardar-detalle");

    if (!boton || !restauranteSeleccionado) return;

    boton.textContent = estaGuardado(restauranteSeleccionado)
        ? "♥ Quitar de guardados"
        : "♡ Guardar restaurante";
}

function guardarDesdeDetalle() {
    if (restauranteSeleccionado) {
        guardarRestaurante(idRestaurante(restauranteSeleccionado));
    }
}

function renderizarProductosDetalle() {
    const contenedor = $("detalle-productos");
    if (!contenedor || !restauranteSeleccionado) return;

    contenedor.replaceChildren();

    const id = idRestaurante(restauranteSeleccionado);

    const relacionados = productos.filter(producto => {
        const idProducto = producto.id_establecimiento
            ?? producto.establecimiento?.id_establecimiento
            ?? producto.establecimiento?.id;

        const disponible = producto.disponible === undefined
            || Number(producto.disponible) === 1;

        return disponible
            && id !== null
            && String(idProducto) === String(id);
    });

    if (!relacionados.length) {
        contenedor.textContent =
            "Este restaurante todavía no tiene productos disponibles para mostrar.";

        return;
    }

    relacionados.forEach(producto => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "producto-detalle";

        const nombre = escaparHTML(producto.nombre ?? "Producto");
        const descripcion = escaparHTML(producto.descripcion ?? "");
        const precio = producto.precio;

        let precioHTML = "";

        if (precio !== undefined && precio !== null) {
            const valor = Number(precio);

            precioHTML = `
                <p class="precio-producto">
                    ${Number.isFinite(valor)
                        ? valor.toLocaleString("es-CO", {
                            style: "currency",
                            currency: "COP",
                            maximumFractionDigits: 0
                        })
                        : escaparHTML(precio)}
                </p>
            `;
        }

        tarjeta.innerHTML = `
            <h4>${nombre}</h4>
            <p>${descripcion || "Conoce este producto."}</p>
            ${precioHTML}
        `;

        contenedor.appendChild(tarjeta);
    });
}

function volverAListaRestaurantes() {
    const detalle = $("detalle-restaurante");

    if (detalle) {
        detalle.classList.add("oculto");
        detalle.hidden = true;
    }

    const destino = [
        "inicio",
        "explorar",
        "restaurantes",
        "guardados",
        "perfil"
    ].includes(seccionAnteriorDetalle)
        ? seccionAnteriorDetalle
        : "restaurantes";

    mostrarSeccion(destino);
}

function volverAInicio() {
    seccionAnteriorDetalle = "inicio";
    volverAListaRestaurantes();
}

/* =========================================================
   PERFIL
   ========================================================= */

function actualizarPerfil() {
    const usuario = leerStorage(STORAGE.usuario, {});

    const nombre = usuario?.nombre
        ?? usuario?.nombre_completo
        ?? usuario?.correo?.split("@")[0]
        ?? "Usuario Foodly";

    if ($("nombre-usuario-home")) {
        $("nombre-usuario-home").textContent = nombre;
    }

    if ($("correo-usuario-home")) {
        $("correo-usuario-home").textContent = usuario?.correo ?? "";
    }
}

/* =========================================================
   EVENTOS DE TARJETAS
   ========================================================= */

document.addEventListener("click", evento => {
    const objetivo = evento.target;

    if (!(objetivo instanceof Element)) return;

    const boton = objetivo.closest("[data-accion]");
    if (!boton) return;

    const id = boton.dataset.id;
    const accion = boton.dataset.accion;

    if (accion === "ver") {
        verRestaurante(id);
    }

    if (accion === "guardar") {
        guardarRestaurante(id);
    }
});

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    if ($("ubicacion-actual")) {
        $("ubicacion-actual").textContent = ubicacionSeleccionada;
    }

    actualizarPerfil();

    /*
     * No se registra otro listener para los formularios:
     * el HTML actual ya utiliza onsubmit.
     * Así evitamos enviar dos solicitudes por formulario.
     */
    mostrarPantalla("pantalla-bienvenida");

    console.info("Foodly iniciado.");
    console.info("API configurada:", API_URL);
});
