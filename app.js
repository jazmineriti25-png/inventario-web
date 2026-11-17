(function () {
    "use strict";

    const STORAGE_KEY = "inventario-pastel-products";
    const starterProducts = [
        { id: 1, name: "Lápiz", category: "Papelería", description: "", quantity: 120 },
        { id: 2, name: "Cuaderno", category: "Papelería", description: "", quantity: 50 },
        { id: 3, name: "Borrador", category: "Papelería", description: "", quantity: 35 },
        { id: 4, name: "Regla", category: "Papelería", description: "", quantity: 40 }
    ];

    function validProduct(product) {
        return product && Number.isSafeInteger(product.id) && product.id > 0 &&
            typeof product.name === "string" && product.name.trim() !== "" &&
            typeof product.category === "string" && product.category.trim() !== "" &&
            typeof product.description === "string" &&
            Number.isSafeInteger(product.quantity) && product.quantity >= 0;
    }

    function getProducts() {
        let raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
            if (raw === null) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(starterProducts));
                return starterProducts.map(function (product) { return Object.assign({}, product); });
            }
        } catch (error) {
            throw new Error("No se pudo acceder al almacenamiento del navegador. Revisa la configuración de privacidad e inténtalo de nuevo.");
        }

        let products;
        try {
            products = JSON.parse(raw);
        } catch (error) {
            throw new Error("Los datos guardados están dañados. No se modificó el inventario para evitar perder información.");
        }
        if (!Array.isArray(products) || !products.every(validProduct) ||
            new Set(products.map(function (product) { return product.id; })).size !== products.length) {
            throw new Error("El inventario guardado tiene un formato inválido. No se modificó para proteger tus datos.");
        }
        return products;
    }

    function saveProducts(products) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
            return true;
        } catch (error) {
            showMessage("No se pudo guardar. El almacenamiento puede estar lleno o bloqueado; libera espacio e inténtalo de nuevo.", true);
            return false;
        }
    }

    function showMessage(message, isError) {
        const element = document.getElementById("page-message");
        if (!element) {
            window.alert(message);
            return;
        }
        element.textContent = message;
        element.classList.toggle("error", Boolean(isError));
        element.hidden = false;
    }

    function loadProductsOrReportError() {
        try {
            return getProducts();
        } catch (error) {
            showMessage(error.message, true);
            return null;
        }
    }

    function renderHome() {
        const products = loadProductsOrReportError();
        if (!products) return;
        document.getElementById("total-products").textContent = String(products.length);
        document.getElementById("total-units").textContent = String(products.reduce(function (sum, product) {
            return sum + product.quantity;
        }, 0));
        document.getElementById("out-of-stock").textContent = String(products.filter(function (product) {
            return product.quantity === 0;
        }).length);
    }

    function renderProducts(products, searchTerm) {
        const tbody = document.getElementById("product-list");
        const normalizedTerm = searchTerm.trim().toLocaleLowerCase("es");
        const filtered = products.filter(function (product) {
            return (product.name + " " + product.category + " " + product.description)
                .toLocaleLowerCase("es").includes(normalizedTerm);
        });
        tbody.replaceChildren();
        filtered.forEach(function (product) {
            const row = document.createElement("tr");
            const idCell = document.createElement("td");
            idCell.textContent = String(product.id);
            row.appendChild(idCell);

            const nameCell = document.createElement("td");
            const name = document.createElement("span");
            name.className = "product-name";
            name.textContent = product.name;
            nameCell.appendChild(name);
            if (product.description) {
                const description = document.createElement("span");
                description.className = "product-description";
                description.textContent = product.description;
                nameCell.appendChild(description);
            }
            row.appendChild(nameCell);

            const categoryCell = document.createElement("td");
            categoryCell.textContent = product.category;
            row.appendChild(categoryCell);

            const quantityCell = document.createElement("td");
            quantityCell.textContent = String(product.quantity);
            row.appendChild(quantityCell);

            const actionsCell = document.createElement("td");
            const actions = document.createElement("div");
            actions.className = "row-actions";
            const edit = document.createElement("a");
            edit.className = "button secondary small";
            edit.href = "agregar.html?id=" + encodeURIComponent(product.id);
            edit.textContent = "Modificar";
            edit.setAttribute("aria-label", "Modificar " + product.name);
            actions.appendChild(edit);
            const remove = document.createElement("button");
            remove.className = "danger small";
            remove.type = "button";
            remove.textContent = "Eliminar";
            remove.setAttribute("aria-label", "Eliminar " + product.name);
            remove.addEventListener("click", function () { deleteProduct(product.id); });
            actions.appendChild(remove);
            actionsCell.appendChild(actions);
            row.appendChild(actionsCell);
            tbody.appendChild(row);
        });
        document.getElementById("product-count").textContent =
            filtered.length + (filtered.length === 1 ? " producto" : " productos");
        document.getElementById("empty-products").hidden = filtered.length !== 0;
    }

    function deleteProduct(id) {
        const products = loadProductsOrReportError();
        if (!products) return;
        const product = products.find(function (item) { return item.id === id; });
        if (!product || !window.confirm('¿Eliminar "' + product.name + '"? Esta acción no se puede deshacer.')) return;
        const remaining = products.filter(function (item) { return item.id !== id; });
        if (saveProducts(remaining)) {
            renderProducts(remaining, document.getElementById("product-search").value);
            showMessage("Producto eliminado correctamente.", false);
        }
    }

    function csvCell(value) {
        return '"' + String(value).replace(/"/g, '""') + '"';
    }

    function exportProducts() {
        const products = loadProductsOrReportError();
        if (!products) return;
        const rows = [["ID", "Producto", "Categoría", "Descripción", "Existencia"]].concat(
            products.map(function (product) {
                return [product.id, product.name, product.category, product.description, product.quantity];
            })
        );
        const csv = "\uFEFF" + rows.map(function (row) {
            return row.map(csvCell).join(";");
        }).join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "reporte-inventario.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function setupProductList() {
        const products = loadProductsOrReportError();
        if (!products) return;
        const search = document.getElementById("product-search");
        renderProducts(products, "");
        search.addEventListener("input", function () {
            renderProducts(products, search.value);
        });
        document.getElementById("export-products").addEventListener("click", exportProducts);
    }

    function setupForm() {
        const form = document.getElementById("product-form");
        const products = loadProductsOrReportError();
        if (!products) {
            form.querySelectorAll("input, textarea, button[type=submit]").forEach(function (element) {
                element.disabled = true;
            });
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get("id");
        const editingId = requestedId === null ? null : Number(requestedId);
        const existing = editingId === null ? null : products.find(function (product) {
            return product.id === editingId;
        });
        if (requestedId !== null && (!Number.isSafeInteger(editingId) || !existing)) {
            showMessage("No se encontró el producto solicitado. Puede haber sido eliminado.", true);
            form.querySelectorAll("input, textarea, button[type=submit]").forEach(function (element) {
                element.disabled = true;
            });
            return;
        }

        if (existing) {
            document.getElementById("form-title").textContent = "Modificar producto";
            document.getElementById("save-product").textContent = "Guardar cambios";
            document.title = "Modificar producto | Inventario Pastel";
            document.getElementById("product-name").value = existing.name;
            document.getElementById("product-category").value = existing.category;
            document.getElementById("product-description").value = existing.description;
            document.getElementById("product-quantity").value = String(existing.quantity);
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const nameInput = document.getElementById("product-name");
            const categoryInput = document.getElementById("product-category");
            const descriptionInput = document.getElementById("product-description");
            const quantityInput = document.getElementById("product-quantity");
            const name = nameInput.value.trim();
            const category = categoryInput.value.trim();
            const quantity = Number(quantityInput.value);

            if (!name || !category) {
                showMessage("Completa el nombre y la categoría del producto.", true);
                (!name ? nameInput : categoryInput).focus();
                return;
            }
            if (name.length > 80 || category.length > 60 || descriptionInput.value.length > 300) {
                showMessage("Revisa la longitud de los campos: nombre (80), categoría (60) y descripción (300 caracteres máximo).", true);
                return;
            }
            if (!Number.isSafeInteger(quantity) || quantity < 0 || quantityInput.value.trim() === "") {
                showMessage("La cantidad debe ser un número entero igual o mayor que cero.", true);
                quantityInput.focus();
                return;
            }
            const duplicate = products.some(function (product) {
                return product.id !== editingId &&
                    product.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es") &&
                    product.category.toLocaleLowerCase("es") === category.toLocaleLowerCase("es");
            });
            if (duplicate && !window.confirm("Ya existe un producto con ese nombre y categoría. ¿Deseas guardarlo de todos modos?")) {
                return;
            }

            let updated;
            if (existing) {
                updated = products.map(function (product) {
                    if (product.id !== editingId) return product;
                    return {
                        id: product.id,
                        name: name,
                        category: category,
                        description: descriptionInput.value.trim(),
                        quantity: quantity
                    };
                });
            } else {
                const nextId = products.reduce(function (maxId, product) {
                    return Math.max(maxId, product.id);
                }, 0) + 1;
                if (!Number.isSafeInteger(nextId)) {
                    showMessage("No se pudo crear un identificador de producto. Contacta al administrador.", true);
                    return;
                }
                updated = products.concat([{
                    id: nextId,
                    name: name,
                    category: category,
                    description: descriptionInput.value.trim(),
                    quantity: quantity
                }]);
            }

            if (saveProducts(updated)) {
                window.location.href = "productos.html";
            }
        });
    }

    if (document.getElementById("total-products")) renderHome();
    if (document.getElementById("product-list")) setupProductList();
    if (document.getElementById("product-form")) setupForm();
}());
