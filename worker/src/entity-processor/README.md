# Entity Processor

The `EntityProcessor` is a crucial component responsible for processing and synchronizing individual Stripe entities to Notion. It handles dependency resolution, caching, and interaction with both the Stripe and Notion APIs.

## Core Behavior

The primary method is `processEntity`, which takes a Stripe entity type and ID and orchestrates its synchronization to a corresponding Notion page.

### Step-by-Step Processing Flow

1.  **Configuration Lookup**: The processor first looks up the configuration for the given `entityType` in the `ENTITY_REGISTRY`. This configuration defines how to retrieve the entity from Stripe, its dependencies, and how to handle its sub-entities.

2.  **Cache Check**: To avoid redundant processing within a single session (e.g., a single webhook event), it checks an in-memory `entityCache`. If the entity has already been processed, it skips the full workflow and attempts to return the already-known Notion Page ID.

3.  **Mark as Processed**: The entity is marked as "processed" in the cache to prevent infinite loops in cases of circular dependencies.

4.  **Retrieve from Stripe**: The full entity object is fetched from the Stripe API.

5.  **Dependency Resolution**: The `DependencyProcessor` is invoked to handle any dependencies the entity might have. For example, a Stripe `Invoice` object has a dependency on a `Customer` object.

6.  **Sync to Notion**: The `NotionSyncService` is called to create or update the page in the corresponding Notion database. It uses the resolved dependency page IDs from the previous step to correctly link related Notion pages.

7.  **Process Sub-Entities**: If the entity has sub-entities (e.g., an `Invoice` has `Invoice Line Items`), a specific `SubEntityProcessor` is used to process them. This step is skipped for dependent entities to avoid over-fetching.

8.  **Process Discounts**: For entities that can have discounts (`Customer`, `Invoice`, `Subscription`), the `DiscountProcessor` is called to handle and sync them.

9.  **Return Result**: The final Notion Page ID and the full, expanded Stripe entity are returned.

### Recursive Dependency Resolution

The `EntityProcessor` recursively resolves dependencies to ensure that all related entities are present in Notion before the primary entity is created. This is a critical feature for maintaining data integrity and relationships between different Notion databases.

The process works as follows:

1.  When `processEntity` is called for a primary entity (e.g., a `Subscription`), the `DependencyProcessor` identifies its direct dependencies (e.g., an `Invoice` and a `Customer`).

2.  For each dependency, the `DependencyProcessor` recursively calls `entityProcessor.processEntity`. For instance, it will call `processEntity` for the `Invoice`.

3.  Crucially, this recursive call includes the option `isForDependencyResolution: true`. This flag is the key to managing the dependency chain efficiently.

#### The Role of `isForDependencyResolution`

The `isForDependencyResolution` flag fine-tunes the processor's behavior. When it's set to `true`, the processor strikes a balance between data completeness and performance.

*   **What it DOES:**
    1.  **Resolves its own dependencies:** An entity being processed as a dependency (e.g., the `Invoice`) will still resolve its own dependencies (e.g., the `Customer`). The dependency chain is always followed to its end.
    2.  **Syncs the full object:** The entity (e.g., the `Customer`) is fetched completely from Stripe and a full page is created in Notion with all its properties. It is **not** a stub.

*   **What it PREVENTS:**
    1.  **Processing Sub-Entities:** It stops the processor from continuing on to process "child" objects. For example, when processing an `Invoice` as a dependency, it will **not** go on to process all of its `Invoice Line Items`.
    2.  **Processing Discounts:** It also skips processing any discounts associated with the dependency.

This prevents a "cascade explosion" of processing. Without this flag, processing a single `Subscription` could trigger updates on dozens of related objects, leading to poor performance.

#### Example Flow: Subscription -> Invoice -> Customer

1.  **`processEntity('subscription', ...)` is called.**
    *   `isForDependencyResolution` is `false`.
    *   It identifies a dependency on `invoice: 'in_abc'`.
    *   It recursively calls `processEntity('invoice', 'in_abc', { isForDependencyResolution: true })`.

2.  **`processEntity('invoice', ...)` runs.**
    *   `isForDependencyResolution` is `true`.
    *   It identifies a dependency on `customer: 'cus_123'`.
    *   It recursively calls `processEntity('customer', 'cus_123', { isForDependencyResolution: true })`.

3.  **`processEntity('customer', ...)` runs.**
    *   `isForDependencyResolution` is `true`.
    *   It has no further dependencies.
    *   It syncs the **full customer object** to the "Customers" database in Notion.
    *   Because the flag is `true`, it **skips** processing the customer's sub-entities (like payment methods) and returns the new customer page ID.

4.  **Control returns to the Invoice.**
    *   It now has the customer's page ID.
    *   It syncs the **full invoice object** to the "Invoices" database, linking it to the customer page.
    *   Because the flag is `true`, it **skips** processing the invoice's sub-entities (`Invoice Line Items`) and returns the new invoice page ID.

5.  **Control returns to the Subscription.**
    *   It now has the invoice's page ID.
    *   It syncs the **full subscription object** to the "Subscriptions" database, linking it to the invoice.
    *   Because `isForDependencyResolution` was `false` for this top-level call, it **proceeds** to fully process its own sub-entities (`Subscription Items`).

## Other Methods

-   `processDiscountEvent`: A specialized method to handle `discount` objects, which are not top-level entities and are processed in the context of their parent (`Customer`, `Invoice`, etc.).
-   `processEntityComplete`: A wrapper around `processEntity` that forces a full update of an entity and its relationships.

## Instantiation

The `EntityProcessor` is not instantiated directly. Instead, it's created using one of two static factory methods:

-   `fromWebhook`: Used when processing a Stripe webhook event. It creates the processor with the context derived from the webhook handler.
-   `fromWorkflow`: Used within background workflows, such as the backfill process. It sets up the processor with the necessary context for the workflow's execution.
