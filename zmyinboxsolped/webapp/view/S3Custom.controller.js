sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/UploadCollectionParameter",
    "sap/m/VBox",
    "sap/m/ObjectAttribute",
    "sap/m/ObjectStatus",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/library",
    "sap/base/Log",
    "sap/base/security/encodeURL",
    "sap/suite/ui/commons/TimelineItem",
    "sap/ui/thirdparty/jquery",
    "sap/ui/Device",
    "sap/ui/core/Fragment",
    "sap/ui/core/mvc/XMLView",
    "sap/ui/layout/form/FormElement",
    "sap/ui/layout/ResponsiveFlowLayoutData",
    "sap/ui/model/Context",
    "sap/ui/model/json/JSONModel",
    "cross/fnd/fiori/inbox/attachment/util/AttachmentFormatters",
    "cross/fnd/fiori/inbox/controller/BaseController",
    "cross/fnd/fiori/inbox/util/tools/Application",
    "cross/fnd/fiori/inbox/util/tools/CommonHeaderFooterHelper",
    "cross/fnd/fiori/inbox/util/ActionHelper",
    "cross/fnd/fiori/inbox/util/Forward",
    "cross/fnd/fiori/inbox/util/ForwardSimple",
    "cross/fnd/fiori/inbox/util/SupportInfo",
    "cross/fnd/fiori/inbox/util/Conversions",
    "cross/fnd/fiori/inbox/util/Resubmit",
    "cross/fnd/fiori/inbox/util/Parser",
    "cross/fnd/fiori/inbox/util/ConfirmationDialogManager",
    "cross/fnd/fiori/inbox/util/EmployeeCard",
    "cross/fnd/fiori/inbox/util/ComponentCache",
    "cross/fnd/fiori/inbox/util/CommonFunctions",
    "cross/fnd/fiori/inbox/util/Utils",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/Component",
    "sap/ui/core/routing/History",
    "sap/ui/core/Core",
    "cross/fnd/fiori/inbox/util/Constants",
    "sap/ui/model/odata/v2/ODataModel"
], function (
    MessageBox, MessageToast, UploadCollectionParameter, VBox, ObjectAttribute, ObjectStatus, Text, Label, mobileLibrary, Log, encodeURL,
    TimelineItem, jQuery, Device, Fragment, XMLView, FormElement, ResponsiveFlowLayoutData, Context, JSONModel,
    AttachmentFormatters, BaseController, Application, CommonHeaderFooterHelper, ActionHelper, Forward, ForwardSimple,
    SupportInfo, Conversions, Resubmit, Parser, ConfirmationDialogManager, EmployeeCard, ComponentCache,
    CommonFunctions, Utils, DateFormat, Component, History, Core, Constants, ODataModelV2
) {
    "use strict";

    return sap.ui.controller("customer.zmyinboxsolped.view.S3Custom", {

        onInit: function () {
            var oView = this.getView();

            // Modelo detail estándar
            this.oModel2 = new JSONModel();
            this.resetDetailView();
            oView.setModel(this.oModel2, "detail");
            this.i18nBundle = this.getResourceBundle();

            // Modelos locales para SOLPED
            oView.setModel(new JSONModel({}), "solpedHeader");
            oView.setModel(new JSONModel([]), "solpedItems");

            // EventBus estándar
            this.sResubmitUniqueId = this.createId() + "DLG_RESUBMIT";
            var oEventBus = this.getOwnerComponent().getEventBus();
            oEventBus.subscribe("cross.fnd.fiori.inbox", "open_supportinfo", this.onSupportInfoOpenEvent, this);
            oEventBus.subscribe("cross.fnd.fiori.inbox.dataManager", "taskCollectionFailed", this.onTaskCollectionFailed.bind(this));
            oEventBus.subscribe("cross.fnd.fiori.inbox.dataManager", "showReleaseLoaderOnInfoTab", this.onShowReleaseLoaderOnInfoTab.bind(this));
            oEventBus.subscribe("cross.fnd.fiori.inbox.dataManager", "showReleaseLoader", this.onShowReleaseLoader.bind(this));
            oEventBus.subscribe("cross.fnd.fiori.inbox.dataManager", "UIExecutionLinkRequest", this.onShowReleaseLoader.bind(this));

            // Suscripción para refresh de tarea
            oEventBus.subscribe("cross.fnd.fiori.inbox.dataManager", "refreshTask", function () {
                this.extHookOnDataLoaded();
            }.bind(this), this);

            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.attachRoutePatternMatched(this.handleNavToDetail, this);
            this.oRouter.attachBeforeRouteMatched(this.handleBeforeRouteMatched, this);

            this.oTabBar = oView.byId("tabBar");
            var oDataManager = this.getOwnerComponent().getDataManager();
            if (oDataManager) {
                var iCache = oDataManager.getCacheSize();
                this.oComponentCache = new ComponentCache(iCache || undefined);
            } else {
                this.oComponentCache = new ComponentCache();
            }

            this._setExtensionState(false);

            oView.byId("InvisibleTabStop").addEventDelegate({
                onsapspace: function () {
                    var N;
                    if (this.bShowLogs) {
                        N = this.byId("LogButtonID");
                        if (N) this.onLogBtnPress();
                    } else if (this.bShowDetails) {
                        N = this.byId("DetailsButtonID");
                        if (N) this.onDetailsBtnPress();
                    }
                    setTimeout(function () { N && N.focus(); }, 300);
                }
            }, this);

            if (!oDataManager.oServiceMetaModel) {
                oDataManager.oModel.getMetaModel().loaded().then(function () {
                    oDataManager.oServiceMetaModel = oDataManager.oModel.getMetaModel();
                }.bind(this));
            }

            this.oAppImp = Application.getImpl();
            this.bShowLogs = false;
            this.bShowDetails = false;

            
        },

        // Hook para extender - se ejecuta cuando se cargan los datos de la tarea
        extHookOnDataLoaded: function () {
            try {
                var oDetail = this.getView().getModel("detail");
                if (!oDetail) {
                    sap.m.MessageToast.show("No se encontró el modelo 'detail'.");
                    return;
                }

                var sTitle = oDetail.getProperty("/TaskTitle") || "";

                var k = this._getKeysFromTask(sTitle); // { banfn, bnfpo }

                // Logs de verificación
                console.log("Título:", sTitle);
                console.log("BANFN extraído:", k.banfn);
                console.log("BNFPO extraído:", k.bnfpo);

                if (!k.banfn) {
                    sap.m.MessageToast.show("No se encontró Nº de SOLPED.");
                    return;
                }
                this._loadSolped(k.banfn, k.bnfpo);

            } catch (e) {
                jQuery.sap.log.error("extHookOnDataLoaded error", e);
                sap.m.MessageBox.error("Ocurrió un error al preparar los datos de la tarea.");
            }
        },

        _extractSolpedFromTitle: function (sTitle) {
            var m = String(sTitle || "").match(/(\d{7,10})/);
            return m ? m[1] : "";
        },

        _getSolpedFromCustomAttributes: function () {
            try {
                var oDetail = this.getView().getModel("detail");
                var aCustomAttrs = oDetail && oDetail.getProperty("/CustomAttributeData");
                if (aCustomAttrs) {
                    for (var i = 0; i < aCustomAttrs.length; i++) {
                        if (aCustomAttrs[i].Name === "SOLPED" || aCustomAttrs[i].Name === "Solped") {
                            return aCustomAttrs[i].Value;
                        }
                    }
                }
            } catch (e) {
                Log.error("Error extrayendo SOLPED de CustomAttributes", e);
            }
            return "";
        },

        _loadSolped: function (sSolped, sPos) {
            var oView = this.getView();
            var oZModel = this.getOwnerComponent().getModel("Z_MM_WF_SOLPED_SRV");
            if (!oZModel) { sap.m.MessageBox.error("El modelo Z_MM_WF_SOLPED_SRV no está disponible"); return; }

            // Detecta si estás en Outbox (para suavizar errores y logs)
            var bOutbox = this._isOutboxMode();

            // Normaliza posición (si viene) a 5 dígitos
            if (sPos) { sPos = sPos.toString().padStart(5, "0"); }

            // Normaliza BANFN a 10 dígitos (evita 404 por clave corta)
            sSolped = this._normBanfn(sSolped);

            // Construye el path del header con tu helper (String key con comillas)
            // _getBanfnPath(oModel, "Z_MM_WF_SOLPEDSet", sSolped) debe devolver "/Z_MM_WF_SOLPEDSet('00XXXXXXXX')"
            var sHeaderPath = this._getBanfnPath(oZModel, "Z_MM_WF_SOLPEDSet", sSolped);

            // Filtro para el detalle: asume campo "Solped" string; ya normalizado a 10
            var sFilter = "Solped eq '" + sSolped + "'";

            oView.setBusy(true);

            var pHeader = new Promise(function (resolve, reject) {
                oZModel.read(sHeaderPath, { success: resolve, error: reject });
            });

            var pItems = new Promise(function (resolve, reject) {
                oZModel.read("/EDetSet", {
                    urlParameters: { "$filter": sFilter },
                    success: function (oData) { resolve((oData && oData.results) || []); },
                    error: reject
                });
            });

            Promise.all([pHeader, pItems]).then(function (aResults) {
                var oHeaderData = aResults[0];
                var aItems = aResults[1] || [];

                // Detecta el nombre real del campo de posición
                var posField = "Posicion";
                if (aItems.length) {
                    ["Posicion", "EBELP", "BNFPO", "Ebelp", "Bnfpo"].some(function (f) {
                        if (f in aItems[0]) { posField = f; return true; }
                        return false;
                    });
                }

                // Filtro por posición (normalizando a 5)
                if (sPos) {
                    var norm5 = function (v) { return (v == null ? "" : v).toString().padStart(5, "0"); };
                    aItems = aItems.filter(function (it) { return norm5(it[posField]) === sPos; });
                }

                // Actualiza modelos locales
                oView.getModel("solpedHeader").setData(oHeaderData);
                oView.getModel("solpedItems").setData(aItems);
                oView.getModel("solpedHeader").refresh(true);
                oView.getModel("solpedItems").refresh(true);

                // Mantén tu filtro de binding (por si el backend no trae padding)
                this._applyItemFilterByPos(sPos, posField);

                oView.setBusy(false);

                if (!aItems.length) {
                    sap.m.MessageToast.show("No se encontraron posiciones para la SOLPED " + sSolped + (sPos ? (" (pos. " + sPos + ")") : ""));
                }
            }.bind(this)).catch(function (oError) {
                oView.setBusy(false);

                // En Outbox, las tareas completas a veces no devuelven todo → usa toast y log
                if (bOutbox) {
                    sap.base.Log.warning("Outbox: lectura SOLPED falló o incompleta", oError);
                    sap.m.MessageToast.show("No fue posible recuperar el detalle completo de la SOLPED (Outbox).");
                } else {
                    var sMsg = "Error cargando datos de SOLPED";
                    if (oError && oError.message) { sMsg += ": " + oError.message; }
                    sap.m.MessageBox.error(sMsg);
                    sap.base.Log.error("Error en _loadSolped", oError);
                }
            });
        },

        onItemsUpdateFinished: function (oEvent) {
            var iTotal = oEvent.getParameter("total");
            if (iTotal < 0) {
                var oBinding = this.byId("tblItems").getBinding("items");
                iTotal = oBinding ? oBinding.getLength() : 0;
            }
            this.byId("posTitle").setText("Posiciones (" + iTotal + ")");
        },

        _getAttrCI: function (name) {
            var a = this.getView().getModel("detail").getProperty("/CustomAttributeData");

            // Normaliza a un array
            if (!Array.isArray(a)) {
                if (a && Array.isArray(a.results)) {
                    a = a.results;           // caso OData { results: [...] }
                } else {
                    a = [];                  // null/undefined/otro → vacío
                }
            }

            var key = String(name || "").toLowerCase();
            for (var i = 0; i < a.length; i++) {
                var n = String(a[i].Name || "").toLowerCase();
                if (n === key) return a[i].Value || "";
            }
            return "";
        },

        _getKeysFromTask: function (sTitle) {
            // 1) Atributos del task si existen
            var sBanfn = this._getAttrCI("BANFN") || this._getAttrCI("Solped");
            var sBnfpo = this._getAttrCI("BNFPO") || this._getAttrCI("Posicion") || this._getAttrCI("EBELP");

            // 2) Fallback: parsear NÚMEROS del título (p.ej. "Requisition release 10217257 00050")
            var nums = String(sTitle || "").match(/\d+/g) || [];

            if (!sBanfn) {
                // primer número largo (7-10 dígitos) = BANFN
                sBanfn = nums.find(function (n) { return n.length >= 7 && n.length <= 10; }) || "";
            }

            if (!sBnfpo) {
                // último token de 5 dígitos = posición
                for (var i = nums.length - 1; i >= 0; i--) {
                    if (nums[i].length === 5) { sBnfpo = nums[i]; break; }
                }
            }

            if (sBnfpo) { sBnfpo = sBnfpo.toString().padStart(5, "0"); }
            return { banfn: sBanfn, bnfpo: sBnfpo };
        },

        _applyItemFilterByPos: function (sPos, posField) {
            var oTable = this.byId("tblItems");
            if (!oTable) return;
            var oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            if (sPos) {
                var norm = function (v) { return (v == null ? "" : v).toString().padStart(5, "0"); };

                // Filtro con función de test (independiente del nombre del campo exacto y del padding)
                var oFuncFilter = new sap.ui.model.Filter({
                    path: posField || "Posicion",
                    test: function (value /* valor de posField en el item */) {
                        return norm(value) === sPos;
                    }
                });

                oBinding.filter([oFuncFilter], "Application");
            } else {
                oBinding.filter([], "Application");
            }
        },

        //Funcion para Outbox

        _isOutboxMode: function () {
            try {
                // 1) Por intent/hash
                var sHash = sap.ui.core.routing.HashChanger.getInstance().getHash() || "";
                if (sHash.indexOf("WorkflowTask-displayOutbox") > -1 || /[?&]outbox=true\b/.test(sHash)) {
                    return true;
                }
                // 2) Por startupParameters (cuando corre en FLP)
                var sp = (this.getOwnerComponent().getComponentData() || {}).startupParameters || {};
                if (sp.outbox && String(sp.outbox[0]).toLowerCase() === "true") return true;
            } catch (e) { }
            return false;
        },
        _normBanfn: function (s) {
            if (s == null) return "";
            s = String(s).trim();
            // Si ya es numérico pero el servicio espera String 10, pad a 10:
            // Lo más seguro: siempre pad a 10 y usar comillas en el path (String).
            return s.padStart(10, "0");
        },

        _getBanfnPath: function (oModel, sEntitySet, sBanfn) {
            var sKey = this._normBanfn(sBanfn);
            return `/${sEntitySet}('${encodeURIComponent(sKey)}')`; // String-key (banfn de 10)
            // Si quisieras soportar Int32:
            // return `/${sEntitySet}(${Number(sBanfn)})`;
        },
        _getSolpedFromObjectLinks: function () {
            try {
                var a = this.getView().getModel("detail").getProperty("/ObjectLinks");
                if (!a) return "";
                // Busca números largos como BANFN en los textos/enlaces
                var asText = JSON.stringify(a);
                var m = asText.match(/\b\d{7,10}\b/g);
                return (m && m[0]) || "";
            } catch (e) {
                return "";
            }
        },

        _getKeysFromTask: function (sTitle) {
            var sBanfn = this._getAttrCI("BANFN") || this._getAttrCI("Solped") || this._getSolpedFromObjectLinks();
            var sBnfpo = this._getAttrCI("BNFPO") || this._getAttrCI("Posicion") || this._getAttrCI("EBELP");

            var nums = String(sTitle || "").match(/\d+/g) || [];
            if (!sBanfn) { sBanfn = nums.find(function (n) { return n.length >= 7 && n.length <= 10; }) || ""; }
            if (!sBnfpo) {
                for (var i = nums.length - 1; i >= 0; i--) { if (nums[i].length === 5) { sBnfpo = nums[i]; break; } }
            }

            if (sBnfpo) { sBnfpo = sBnfpo.toString().padStart(5, "0"); }
            // ¡Clave!: normaliza BANFN a 10 para lecturas
            if (sBanfn) { sBanfn = this._normBanfn(sBanfn); }
            return { banfn: sBanfn, bnfpo: sBnfpo };
        },
        


    });
});