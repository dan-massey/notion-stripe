import type {
  CreateDatabaseParameters
} from "@notionhq/client/build/src/api-endpoints";
import {
  titleProperty,
  richTextProperty,
  checkboxProperty,
  urlProperty,
  dateProperty,
  numberProperty,
  createMetadataFields
} from "./utils";

export const productSchema: CreateDatabaseParameters["properties"] = {
  "Product ID": titleProperty(),
  "Link": urlProperty(),
  "Name": richTextProperty(),
  "Active": checkboxProperty(),
  "Description": richTextProperty(),
  "Default Price": richTextProperty(),
  "Statement Descriptor": richTextProperty(),
  "Unit Label": richTextProperty(),
  "Tax Code": richTextProperty(),
  "URL": urlProperty(),
  "Shippable": checkboxProperty(),
  "Live Mode": checkboxProperty(),
  "Created Date": dateProperty(),
  "Updated Date": dateProperty(),
  "Images Count": numberProperty(),
  "Images URLs": richTextProperty(),
  "Marketing Features Count": numberProperty(),
  "Marketing Features": richTextProperty(),
  "Package Height": numberProperty(),
  "Package Length": numberProperty(),
  "Package Width": numberProperty(),
  "Package Weight": numberProperty(),
  ...createMetadataFields()
};