jQuery.sap.declare("customer.zmyinboxsolped.Component");

// use the load function for getting the optimized preload file if present
sap.ui.component.load({
	name: "cross.fnd.fiori.inbox",
	// Use the below URL to run the extended application when SAP-delivered application is deployed on SAPUI5 ABAP Repository
	url: "/sap/bc/ui5_ui5/sap/CA_FIORI_INBOX"

	// we use a URL relative to our own component
	// extension application is deployed with customer namespace
});

cross.fnd.fiori.inbox.Component.extend("customer.zmyinboxsolped.Component", {
	metadata: {
		manifest: "json"
	}	
});
