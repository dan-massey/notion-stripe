import type Stripe from "stripe";
import { 
  createTitleProperty,
  createRichTextProperty, 
  createCheckboxProperty,
  createUrlProperty,
  createDateProperty,
  createNumberProperty,
  createSearchLinkProperty
} from "@/converters/utils";

export function stripeProductToNotionProperties(product: Stripe.Product) {
  const properties: Record<string, any> = {
    "Product ID": createTitleProperty(product.id),
    "Link": createSearchLinkProperty(product.livemode, product.id),
    "Name": createRichTextProperty(product.name),
    "Active": createCheckboxProperty(product.active),
    "Description": createRichTextProperty(product.description),
    "Default Price": createRichTextProperty(
      typeof product.default_price === "string" 
        ? product.default_price 
        : product.default_price?.id
    ),
    "Statement Descriptor": createRichTextProperty(product.statement_descriptor),
    "Unit Label": createRichTextProperty(product.unit_label),
    "Tax Code": createRichTextProperty(
      typeof product.tax_code === "string" 
        ? product.tax_code 
        : product.tax_code?.id
    ),
    "URL": createUrlProperty(product.url),
    "Shippable": createCheckboxProperty(product.shippable),
    "Live Mode": createCheckboxProperty(product.livemode),
    "Created Date": createDateProperty(product.created),
    "Updated Date": createDateProperty(product.updated),
    "Metadata": createRichTextProperty(JSON.stringify(product.metadata || {})),
  };

  // Handle images
  properties["Images Count"] = createNumberProperty(product.images?.length || 0);
  properties["Images URLs"] = createRichTextProperty(product.images?.join(", ") || "");

  // Handle marketing features
  const featuresText = product.marketing_features
    ?.map(feature => feature.name || "")
    .filter(name => name)
    .join(", ") || "";
  
  properties["Marketing Features Count"] = createNumberProperty(product.marketing_features?.length || 0);
  properties["Marketing Features"] = createRichTextProperty(featuresText);

  // Handle package dimensions  
  properties["Package Height"] = createNumberProperty(product.package_dimensions?.height);
  properties["Package Length"] = createNumberProperty(product.package_dimensions?.length);
  properties["Package Width"] = createNumberProperty(product.package_dimensions?.width);
  properties["Package Weight"] = createNumberProperty(product.package_dimensions?.weight);

  return properties;
}