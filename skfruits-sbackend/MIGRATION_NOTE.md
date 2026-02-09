# Schema changes (Price & Discount + SizeOption)

After pulling these changes, run the migration when your database is available:

```bash
cd ecommerce-backend
npx prisma migrate dev --name add_original_price_and_size_options
```

Or, if you prefer to sync without creating a migration file:

```bash
npx prisma db push
```

**Changes:**
- **Product**: added `originalPrice` (Float, optional) – MRP for single-price products; added `videos` (String, optional) – JSON array of video URLs for product media.
- **ProductSize**: added `originalPrice` (Float, optional) – MRP per size.
- **SizeOption**: new table for reusable size labels (e.g. S, M, L, 250gm) used in the admin product form checkboxes.

Existing products and sizes are unchanged; new fields are optional and default to `null`.
