import type Stripe from "stripe";

export function stripeProductToNotionProperties(product: Stripe.Product) {
  const properties: Record<string, any> = {
    "Product ID": {
      title: [
        {
          type: "text",
          text: {
            content: product.id,
          },
        },
      ],
    },
    "Name": {
      rich_text: [
        {
          type: "text",
          text: {
            content: product.name || "",
          },
        },
      ],
    },
    "Active": {
      checkbox: product.active || false,
    },
    "Description": {
      rich_text: [
        {
          type: "text",
          text: {
            content: product.description || "",
          },
        },
      ],
    },
    "Default Price": {
      rich_text: [
        {
          type: "text",
          text: {
            content: typeof product.default_price === "string" 
              ? product.default_price 
              : product.default_price?.id || "",
          },
        },
      ],
    },
    "Statement Descriptor": {
      rich_text: [
        {
          type: "text",
          text: {
            content: product.statement_descriptor || "",
          },
        },
      ],
    },
    "Unit Label": {
      rich_text: [
        {
          type: "text",
          text: {
            content: product.unit_label || "",
          },
        },
      ],
    },
    "Tax Code": {
      rich_text: [
        {
          type: "text",
          text: {
            content: typeof product.tax_code === "string" 
              ? product.tax_code 
              : product.tax_code?.id || "",
          },
        },
      ],
    },
    "URL": {
      url: product.url || null,
    },
    "Shippable": {
      checkbox: product.shippable || false,
    },
    "Live Mode": {
      checkbox: product.livemode || false,
    },
    "Created Date": {
      date: {
        start: new Date(product.created * 1000).toISOString().split('T')[0],
      },
    },
    "Updated Date": {
      date: {
        start: new Date(product.updated * 1000).toISOString().split('T')[0],
      },
    },
    "Metadata": {
      rich_text: [
        {
          type: "text",
          text: {
            content: JSON.stringify(product.metadata || {}),
          },
        },
      ],
    },
  };

  // Handle images
  if (product.images && product.images.length > 0) {
    properties["Images Count"] = {
      number: product.images.length,
    };

    properties["Images URLs"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: product.images.join(", "),
          },
        },
      ],
    };
  } else {
    properties["Images Count"] = {
      number: 0,
    };

    properties["Images URLs"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };
  }

  // Handle marketing features
  if (product.marketing_features && product.marketing_features.length > 0) {
    properties["Marketing Features Count"] = {
      number: product.marketing_features.length,
    };

    const featuresText = product.marketing_features
      .map(feature => feature.name || "")
      .filter(name => name)
      .join(", ");

    properties["Marketing Features"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: featuresText,
          },
        },
      ],
    };
  } else {
    properties["Marketing Features Count"] = {
      number: 0,
    };

    properties["Marketing Features"] = {
      rich_text: [
        {
          type: "text",
          text: {
            content: "",
          },
        },
      ],
    };
  }

  // Handle package dimensions
  if (product.package_dimensions) {
    properties["Package Height"] = {
      number: product.package_dimensions.height || null,
    };

    properties["Package Length"] = {
      number: product.package_dimensions.length || null,
    };

    properties["Package Width"] = {
      number: product.package_dimensions.width || null,
    };

    properties["Package Weight"] = {
      number: product.package_dimensions.weight || null,
    };
  } else {
    properties["Package Height"] = {
      number: null,
    };

    properties["Package Length"] = {
      number: null,
    };

    properties["Package Width"] = {
      number: null,
    };

    properties["Package Weight"] = {
      number: null,
    };
  }

  return properties;
}