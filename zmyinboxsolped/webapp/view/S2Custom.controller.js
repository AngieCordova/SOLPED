sap.ui.define(["sap/ui/model/Sorter"], function (Sorter) {
  "use strict";

  return sap.ui.controller("customer.zmyinboxsolped.view.S2Custom", {
    _sortedOnce: false,

    onInit: function () {
      var oList = this._getMasterList();
      if (oList) {
        oList.attachUpdateFinished(this._onUpdateFinished, this);
      }
    },

    _getMasterList: function () {
      return this.byId("list") || this.byId("table");
    },

    _onUpdateFinished: function (oEvent) {
      // Evita reordenar cuando el motivo es 'Growing' (scroll)
      var sReason = oEvent.getParameter("reason"); // 'Change' | 'Refresh' | 'Growing' | ...
      if (sReason === "Growing") return;

      // Ordena solo una vez por carga (puedes resetear este flag si cambias de inbox/filtro)
      if (!this._sortedOnce) {
        this._applySort();
        this._sortedOnce = true;
      }
    },

    _applySort: function () {
      var oList = this._getMasterList();
      if (!oList) return;

      var oBinding = oList.getBinding("items");
      if (!oBinding) return;

      // Comparator: BANFN (7–10 dígitos) y luego Posición (5 dígitos)
      var oSorter = new Sorter("TaskTitle", false, null, function (a, b) {
        function keys(t) {
          var nums = String(t || "").match(/\d+/g) || [];
          var banfn = 0, pos = 0;
        for (var i = 0; i < nums.length; i++) {
            if (nums[i].length >= 7 && nums[i].length <= 10) { banfn = parseInt(nums[i], 10); break; }
          }
          for (var j = nums.length - 1; j >= 0; j--) {
            if (nums[j].length === 5) { pos = parseInt(nums[j], 10); break; }
          }
          return { banfn: banfn, pos: pos };
        }
        var k1 = keys(a), k2 = keys(b);
        return (k1.banfn - k2.banfn) || (k1.pos - k2.pos);
      });

      oBinding.sort([oSorter]);
    },

    // (Opcional) si cambias de “All Tasks” a otra bandeja, resetea el flag:
    _resetSortFlag: function () { this._sortedOnce = false; }
  });
});
