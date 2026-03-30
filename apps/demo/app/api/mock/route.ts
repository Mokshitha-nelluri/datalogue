import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock API route — returns canned Northwind-style results so the demo
 * works without a real database or AI provider.
 *
 * Covers 12+ tables: Customers, Orders, Order Details, Products, Categories,
 * Employees, Suppliers, Shippers, Regions, Territories, and cross-table analytics.
 * 17 response patterns with rich multi-column data.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const RESPONSES: Record<string, () => any> = {
  /* ── Customers ───────────────────────────────────────────────── */
  'top 10 customers': () => ({
    sql: `SELECT c.company_name, c.country, c.city, COUNT(o.order_id) AS order_count,\n       SUM(od.unit_price * od.quantity) AS total_value\nFROM customers c\nJOIN orders o ON c.customer_id = o.customer_id\nJOIN "order_details" od ON o.order_id = od.order_id\nGROUP BY c.company_name, c.country, c.city\nORDER BY total_value DESC LIMIT 10`,
    rows: [
      { company_name: 'QUICK-Stop', country: 'Germany', city: 'Cunewalde', order_count: 28, total_value: 110277.31 },
      { company_name: 'Ernst Handel', country: 'Austria', city: 'Graz', order_count: 30, total_value: 104874.98 },
      { company_name: 'Save-a-lot Markets', country: 'USA', city: 'Boise', order_count: 31, total_value: 104361.95 },
      { company_name: 'Rattlesnake Canyon Grocery', country: 'USA', city: 'Albuquerque', order_count: 18, total_value: 51097.80 },
      { company_name: 'Hungry Owl All-Night Grocers', country: 'Ireland', city: 'Cork', order_count: 19, total_value: 49979.91 },
      { company_name: 'Mère Paillarde', country: 'Canada', city: 'Montréal', order_count: 13, total_value: 32555.55 },
      { company_name: 'Folk och fä HB', country: 'Sweden', city: 'Bräcke', order_count: 19, total_value: 32555.55 },
      { company_name: 'Berglunds snabbköp', country: 'Sweden', city: 'Luleå', order_count: 18, total_value: 29567.56 },
      { company_name: 'Simons bistro', country: 'Denmark', city: 'København', order_count: 18, total_value: 26552.64 },
      { company_name: 'White Clover Markets', country: 'USA', city: 'Seattle', order_count: 14, total_value: 22935.35 },
    ],
    summary: 'The top 10 customers by total order value are led by QUICK-Stop ($110K, Germany), followed by Ernst Handel ($105K, Austria) and Save-a-lot Markets ($104K, USA). 3 of the top 10 are US-based.',
    chartSpec: { type: 'bar', data: { labels: ['QUICK-Stop','Ernst Handel','Save-a-lot','Rattlesnake Canyon','Hungry Owl','Mère Paillarde','Folk och fä','Berglunds','Simons bistro','White Clover'], datasets: [{ label: 'Total Order Value ($)', data: [110277,104875,104362,51098,49980,32556,32556,29568,26553,22935] }] } },
    confidence: 'high', executionTimeMs: 42, rowCount: 10, dryRun: false,
  }),

  /* ── Revenue / Time-Series ───────────────────────────────────── */
  'monthly revenue': () => ({
    sql: `SELECT strftime('%Y-%m', o.order_date) AS month,\n       SUM(od.unit_price * od.quantity) AS revenue,\n       COUNT(DISTINCT o.order_id) AS order_count\nFROM orders o\nJOIN "order_details" od ON o.order_id = od.order_id\nWHERE o.order_date BETWEEN '1997-01-01' AND '1997-12-31'\nGROUP BY month ORDER BY month`,
    rows: [
      { month: '1997-01', revenue: 61258.07, order_count: 33 },
      { month: '1997-02', revenue: 38483.64, order_count: 29 },
      { month: '1997-03', revenue: 38547.22, order_count: 30 },
      { month: '1997-04', revenue: 53032.95, order_count: 31 },
      { month: '1997-05', revenue: 53781.29, order_count: 32 },
      { month: '1997-06', revenue: 36362.80, order_count: 22 },
      { month: '1997-07', revenue: 51020.86, order_count: 33 },
      { month: '1997-08', revenue: 47287.67, order_count: 33 },
      { month: '1997-09', revenue: 55629.24, order_count: 37 },
      { month: '1997-10', revenue: 66749.23, order_count: 38 },
      { month: '1997-11', revenue: 43533.80, order_count: 34 },
      { month: '1997-12', revenue: 71398.43, order_count: 48 },
    ],
    summary: 'Monthly revenue for 1997 ranged from $36K (June, 22 orders) to $71K (December, 48 orders). Q4 shows a strong uptrend — October-December combined was $181K, 28% of the annual total.',
    chartSpec: { type: 'line', data: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], datasets: [{ label: 'Revenue ($)', data: [61258,38484,38547,53033,53781,36363,51021,47288,55629,66749,43534,71398] }] } },
    confidence: 'high', executionTimeMs: 38, rowCount: 12, dryRun: false,
  }),

  'quarterly trends': () => ({
    sql: `SELECT \n  CASE WHEN CAST(strftime('%m', o.order_date) AS INTEGER) BETWEEN 1 AND 3 THEN 'Q1'\n       WHEN CAST(strftime('%m', o.order_date) AS INTEGER) BETWEEN 4 AND 6 THEN 'Q2'\n       WHEN CAST(strftime('%m', o.order_date) AS INTEGER) BETWEEN 7 AND 9 THEN 'Q3'\n       ELSE 'Q4' END AS quarter,\n  strftime('%Y', o.order_date) AS year,\n  COUNT(DISTINCT o.order_id) AS orders,\n  SUM(od.unit_price * od.quantity) AS revenue\nFROM orders o JOIN "order_details" od ON o.order_id = od.order_id\nGROUP BY year, quarter ORDER BY year, quarter`,
    rows: [
      { quarter: 'Q3', year: '1996', orders: 72, revenue: 105728.34 },
      { quarter: 'Q4', year: '1996', orders: 80, revenue: 133498.21 },
      { quarter: 'Q1', year: '1997', orders: 92, revenue: 138288.93 },
      { quarter: 'Q2', year: '1997', orders: 85, revenue: 143177.04 },
      { quarter: 'Q3', year: '1997', orders: 103, revenue: 153937.77 },
      { quarter: 'Q4', year: '1997', orders: 120, revenue: 181681.46 },
      { quarter: 'Q1', year: '1998', orders: 135, revenue: 210982.19 },
      { quarter: 'Q2', year: '1998', orders: 60, revenue: 73296.13 },
    ],
    summary: 'Revenue grew consistently from Q3 1996 ($106K) through Q1 1998 ($211K), a 99% increase over 7 quarters. Q2 1998 drops sharply — likely the dataset cutoff point.',
    chartSpec: { type: 'line', data: { labels: ['Q3 96','Q4 96','Q1 97','Q2 97','Q3 97','Q4 97','Q1 98','Q2 98'], datasets: [{ label: 'Quarterly Revenue ($)', data: [105728,133498,138289,143177,153938,181681,210982,73296] }] } },
    confidence: 'high', executionTimeMs: 52, rowCount: 8, dryRun: false,
  }),

  'avg order value': () => ({
    sql: `SELECT strftime('%Y-%m', o.order_date) AS month,\n       ROUND(AVG(order_total), 2) AS avg_order_value,\n       COUNT(*) AS order_count\nFROM (\n  SELECT o.order_id, o.order_date, SUM(od.unit_price * od.quantity) AS order_total\n  FROM orders o JOIN "order_details" od ON o.order_id = od.order_id\n  GROUP BY o.order_id, o.order_date\n) sub JOIN orders o ON sub.order_id = o.order_id\nGROUP BY month ORDER BY month`,
    rows: [
      { month: '1996-07', avg_order_value: 1485.23, order_count: 22 },
      { month: '1996-10', avg_order_value: 1612.75, order_count: 26 },
      { month: '1996-12', avg_order_value: 1789.32, order_count: 31 },
      { month: '1997-01', avg_order_value: 1856.31, order_count: 33 },
      { month: '1997-04', avg_order_value: 1711.39, order_count: 31 },
      { month: '1997-07', avg_order_value: 1546.09, order_count: 33 },
      { month: '1997-10', avg_order_value: 1756.56, order_count: 38 },
      { month: '1997-12', avg_order_value: 1487.47, order_count: 48 },
      { month: '1998-01', avg_order_value: 1732.59, order_count: 55 },
      { month: '1998-03', avg_order_value: 1695.78, order_count: 38 },
    ],
    summary: 'Average order value fluctuated between $1,281 and $1,856 over the dataset period. January 1997 had the highest AOV ($1,856). Volume grew from 22 orders/month (Jul 1996) to 55/month (Jan 1998).',
    chartSpec: { type: 'line', data: { labels: ['Jul 96','Oct 96','Dec 96','Jan 97','Apr 97','Jul 97','Oct 97','Dec 97','Jan 98','Mar 98'], datasets: [{ label: 'Avg Order Value ($)', data: [1485,1613,1789,1856,1711,1546,1757,1487,1733,1696] }] } },
    confidence: 'high', executionTimeMs: 61, rowCount: 10, dryRun: false,
  }),

  /* ── Categories ──────────────────────────────────────────────── */
  'categories': () => ({
    sql: `SELECT c.category_name, c.description, COUNT(p.product_id) AS product_count,\n       AVG(od.quantity) AS avg_quantity,\n       SUM(od.unit_price * od.quantity) AS total_sales\nFROM categories c\nJOIN products p ON c.category_id = p.category_id\nJOIN "order_details" od ON p.product_id = od.product_id\nGROUP BY c.category_name, c.description ORDER BY total_sales DESC`,
    rows: [
      { category_name: 'Beverages', description: 'Soft drinks, coffees, teas, beers, and ales', product_count: 12, avg_quantity: 23.8, total_sales: 267868.19 },
      { category_name: 'Dairy Products', description: 'Cheeses', product_count: 10, avg_quantity: 24.3, total_sales: 234507.28 },
      { category_name: 'Confections', description: 'Desserts, candies, and sweet breads', product_count: 13, avg_quantity: 22.1, total_sales: 167357.22 },
      { category_name: 'Meat/Poultry', description: 'Prepared meats', product_count: 6, avg_quantity: 21.6, total_sales: 163022.37 },
      { category_name: 'Seafood', description: 'Seaweed and fish', product_count: 12, avg_quantity: 21.1, total_sales: 131261.74 },
      { category_name: 'Condiments', description: 'Sweet and savory sauces, relishes, spreads', product_count: 12, avg_quantity: 20.9, total_sales: 106047.09 },
      { category_name: 'Grains/Cereals', description: 'Breads, crackers, pasta, and cereal', product_count: 7, avg_quantity: 21.7, total_sales: 95744.58 },
      { category_name: 'Produce', description: 'Dried fruit and bean curd', product_count: 5, avg_quantity: 20.2, total_sales: 99984.58 },
    ],
    summary: 'Beverages leads total sales at $268K across 12 products. Meat/Poultry is notable for having only 6 products but ranking 4th ($163K).',
    chartSpec: { type: 'bar', data: { labels: ['Beverages','Dairy','Confections','Meat/Poultry','Seafood','Condiments','Grains','Produce'], datasets: [{ label: 'Total Sales ($)', data: [267868,234507,167357,163022,131262,106047,95745,99985] }] } },
    confidence: 'high', executionTimeMs: 27, rowCount: 8, dryRun: false,
  }),

  /* ── Employees ───────────────────────────────────────────────── */
  'employees': () => ({
    sql: `SELECT e.employee_id, e.first_name || ' ' || e.last_name AS employee, e.title, e.city,\n       COUNT(o.order_id) AS order_count,\n       SUM(od.unit_price * od.quantity) AS total_sales\nFROM employees e\nJOIN orders o ON e.employee_id = o.employee_id\nJOIN "order_details" od ON o.order_id = od.order_id\nGROUP BY e.employee_id, employee, e.title, e.city\nORDER BY total_sales DESC`,
    rows: [
      { employee_id: 4, employee: 'Margaret Peacock', title: 'Sales Representative', city: 'Redmond', order_count: 156, total_sales: 250187.45 },
      { employee_id: 3, employee: 'Janet Leverling', title: 'Sales Representative', city: 'Kirkland', order_count: 127, total_sales: 213051.30 },
      { employee_id: 1, employee: 'Nancy Davolio', title: 'Sales Representative', city: 'Seattle', order_count: 123, total_sales: 202143.71 },
      { employee_id: 8, employee: 'Laura Callahan', title: 'Inside Sales Coordinator', city: 'Seattle', order_count: 104, total_sales: 177749.26 },
      { employee_id: 2, employee: 'Andrew Fuller', title: 'Vice President, Sales', city: 'Tacoma', order_count: 96, total_sales: 166537.75 },
      { employee_id: 7, employee: 'Robert King', title: 'Sales Representative', city: 'London', order_count: 72, total_sales: 141295.99 },
      { employee_id: 9, employee: 'Anne Dodsworth', title: 'Sales Representative', city: 'London', order_count: 43, total_sales: 82964.00 },
      { employee_id: 5, employee: 'Steven Buchanan', title: 'Sales Manager', city: 'London', order_count: 42, total_sales: 75567.75 },
      { employee_id: 6, employee: 'Michael Suyama', title: 'Sales Representative', city: 'London', order_count: 67, total_sales: 73913.13 },
    ],
    summary: 'Margaret Peacock leads with $250K across 156 orders. 4 of 9 employees are London-based. Andrew Fuller (VP Sales) is 5th by revenue despite being the highest-ranking.',
    chartSpec: { type: 'bar', data: { labels: ['Margaret','Janet','Nancy','Laura','Andrew','Robert','Anne','Steven','Michael'], datasets: [{ label: 'Total Sales ($)', data: [250187,213051,202144,177749,166538,141296,82964,75568,73913] }] } },
    confidence: 'high', executionTimeMs: 31, rowCount: 9, dryRun: false,
  }),

  'late orders': () => ({
    sql: `SELECT e.first_name || ' ' || e.last_name AS employee,\n       COUNT(o.order_id) AS late_orders,\n       ROUND(COUNT(o.order_id) * 100.0 / (SELECT COUNT(*) FROM orders o2 WHERE o2.employee_id = e.employee_id), 1) AS late_pct\nFROM orders o JOIN employees e ON o.employee_id = e.employee_id\nWHERE o.shipped_date > o.required_date\nGROUP BY e.employee_id, employee ORDER BY late_orders DESC`,
    rows: [
      { employee: 'Margaret Peacock', late_orders: 12, late_pct: 7.7 },
      { employee: 'Nancy Davolio', late_orders: 10, late_pct: 8.1 },
      { employee: 'Janet Leverling', late_orders: 9, late_pct: 7.1 },
      { employee: 'Laura Callahan', late_orders: 8, late_pct: 7.7 },
      { employee: 'Andrew Fuller', late_orders: 6, late_pct: 6.3 },
      { employee: 'Robert King', late_orders: 5, late_pct: 6.9 },
      { employee: 'Steven Buchanan', late_orders: 4, late_pct: 9.5 },
      { employee: 'Michael Suyama', late_orders: 3, late_pct: 4.5 },
      { employee: 'Anne Dodsworth', late_orders: 2, late_pct: 4.7 },
    ],
    summary: 'Steven Buchanan has the highest late percentage (9.5%) despite just 4 late orders. Michael Suyama is most punctual at 4.5%.',
    chartSpec: { type: 'bar', data: { labels: ['Margaret','Nancy','Janet','Laura','Andrew','Robert','Steven','Michael','Anne'], datasets: [{ label: 'Late Order %', data: [7.7,8.1,7.1,7.7,6.3,6.9,9.5,4.5,4.7] }] } },
    confidence: 'high', executionTimeMs: 35, rowCount: 9, dryRun: false,
  }),

  /* ── Products ────────────────────────────────────────────────── */
  'expensive products': () => ({
    sql: `SELECT p.product_name, p.unit_price, p.units_in_stock, p.units_on_order, p.reorder_level,\n       c.category_name, s.company_name AS supplier\nFROM products p\nJOIN categories c ON p.category_id = c.category_id\nJOIN suppliers s ON p.supplier_id = s.supplier_id\nORDER BY p.unit_price DESC LIMIT 10`,
    rows: [
      { product_name: 'Côte de Blaye', unit_price: 263.50, units_in_stock: 17, units_on_order: 0, reorder_level: 15, category_name: 'Beverages', supplier: 'Aux joyeux ecclésiastiques' },
      { product_name: 'Thüringer Rostbratwurst', unit_price: 123.79, units_in_stock: 0, units_on_order: 0, reorder_level: 0, category_name: 'Meat/Poultry', supplier: 'Plutzer Lebensmittelgroßmärkte AG' },
      { product_name: 'Mishi Kobe Niku', unit_price: 97.00, units_in_stock: 29, units_on_order: 0, reorder_level: 0, category_name: 'Meat/Poultry', supplier: 'Tokyo Traders' },
      { product_name: "Sir Rodney's Marmalade", unit_price: 81.00, units_in_stock: 40, units_on_order: 0, reorder_level: 0, category_name: 'Confections', supplier: 'Specialty Biscuits, Ltd.' },
      { product_name: 'Carnarvon Tigers', unit_price: 62.50, units_in_stock: 42, units_on_order: 0, reorder_level: 0, category_name: 'Seafood', supplier: 'Pavlova, Ltd.' },
      { product_name: 'Raclette Courdavault', unit_price: 55.00, units_in_stock: 79, units_on_order: 0, reorder_level: 0, category_name: 'Dairy Products', supplier: 'Gai pâturage' },
      { product_name: 'Manjimup Dried Apples', unit_price: 53.00, units_in_stock: 20, units_on_order: 10, reorder_level: 10, category_name: 'Produce', supplier: "G'day, Mate" },
      { product_name: 'Tarte au sucre', unit_price: 49.30, units_in_stock: 17, units_on_order: 0, reorder_level: 0, category_name: 'Confections', supplier: "Forêts d'érables" },
      { product_name: 'Ipoh Coffee', unit_price: 46.00, units_in_stock: 17, units_on_order: 10, reorder_level: 25, category_name: 'Beverages', supplier: 'Leka Trading' },
      { product_name: 'Rössle Sauerkraut', unit_price: 45.60, units_in_stock: 26, units_on_order: 0, reorder_level: 0, category_name: 'Produce', supplier: 'Plutzer Lebensmittelgroßmärkte AG' },
    ],
    summary: 'The 10 most expensive products range from $263.50 (Côte de Blaye) to $45.60 (Rössle Sauerkraut). Thüringer Rostbratwurst ($123.79) is out of stock and discontinued.',
    chartSpec: { type: 'bar', data: { labels: ['Côte de Blaye','Thüringer R.','Mishi Kobe','Sir Rodneys','Carnarvon','Raclette','Manjimup','Tarte au sucre','Ipoh Coffee','Rössle'], datasets: [{ label: 'Unit Price ($)', data: [263.5,123.79,97.0,81.0,62.5,55.0,53.0,49.3,46.0,45.6] }] } },
    confidence: 'high', executionTimeMs: 12, rowCount: 10, dryRun: false,
  }),

  'product performance': () => ({
    sql: `SELECT p.product_name, c.category_name,\n       SUM(od.quantity) AS total_quantity,\n       SUM(od.unit_price * od.quantity) AS total_revenue,\n       COUNT(DISTINCT o.order_id) AS order_count\nFROM products p\nJOIN categories c ON p.category_id = c.category_id\nJOIN "order_details" od ON p.product_id = od.product_id\nJOIN orders o ON od.order_id = o.order_id\nGROUP BY p.product_name, c.category_name ORDER BY total_revenue DESC LIMIT 15`,
    rows: [
      { product_name: 'Côte de Blaye', category_name: 'Beverages', total_quantity: 623, total_revenue: 141396.74, order_count: 24 },
      { product_name: 'Thüringer Rostbratwurst', category_name: 'Meat/Poultry', total_quantity: 746, total_revenue: 80368.67, order_count: 36 },
      { product_name: 'Raclette Courdavault', category_name: 'Dairy Products', total_quantity: 1496, total_revenue: 71155.70, order_count: 54 },
      { product_name: 'Camembert Pierrot', category_name: 'Dairy Products', total_quantity: 1577, total_revenue: 46825.48, order_count: 51 },
      { product_name: 'Gnocchi di nonna Alice', category_name: 'Grains/Cereals', total_quantity: 1263, total_revenue: 42593.06, order_count: 50 },
      { product_name: 'Manjimup Dried Apples', category_name: 'Produce', total_quantity: 894, total_revenue: 41819.65, order_count: 36 },
      { product_name: 'Alice Mutton', category_name: 'Meat/Poultry', total_quantity: 978, total_revenue: 32698.38, order_count: 31 },
      { product_name: 'Carnarvon Tigers', category_name: 'Seafood', total_quantity: 539, total_revenue: 29171.88, order_count: 21 },
      { product_name: 'Schoggi Schokolade', category_name: 'Confections', total_quantity: 580, total_revenue: 25315.20, order_count: 24 },
      { product_name: 'Tarte au sucre', category_name: 'Confections', total_quantity: 580, total_revenue: 24676.00, order_count: 25 },
      { product_name: 'Ipoh Coffee', category_name: 'Beverages', total_quantity: 580, total_revenue: 23230.00, order_count: 27 },
      { product_name: 'Rössle Sauerkraut', category_name: 'Produce', total_quantity: 544, total_revenue: 22364.40, order_count: 22 },
      { product_name: 'Mozzarella di Giovanni', category_name: 'Dairy Products', total_quantity: 580, total_revenue: 20107.80, order_count: 29 },
      { product_name: "Sir Rodney's Marmalade", category_name: 'Confections', total_quantity: 301, total_revenue: 19711.60, order_count: 15 },
      { product_name: 'Wimmers gute Semmelknödel', category_name: 'Grains/Cereals', total_quantity: 580, total_revenue: 19273.00, order_count: 22 },
    ],
    summary: 'Côte de Blaye is the #1 product by revenue ($141K) despite only 24 orders — its $263.50 unit price makes it premium. Raclette Courdavault has the most orders (54) and units (1,496).',
    chartSpec: { type: 'bar', data: { labels: ['Côte de Blaye','Thüringer R.','Raclette','Camembert','Gnocchi','Manjimup','Alice Mutton','Carnarvon','Schoggi','Tarte au sucre'], datasets: [{ label: 'Total Revenue ($)', data: [141397,80369,71156,46825,42593,41820,32698,29172,25315,24676] }] } },
    confidence: 'high', executionTimeMs: 55, rowCount: 15, dryRun: false,
  }),

  /* ── Suppliers ────────────────────────────────────────────────── */
  'suppliers by country': () => ({
    sql: `SELECT s.country, COUNT(s.supplier_id) AS supplier_count,\n       COUNT(DISTINCT p.product_id) AS product_count,\n       ROUND(AVG(p.unit_price), 2) AS avg_product_price\nFROM suppliers s\nJOIN products p ON s.supplier_id = p.supplier_id\nGROUP BY s.country ORDER BY supplier_count DESC LIMIT 12`,
    rows: [
      { country: 'USA', supplier_count: 4, product_count: 10, avg_product_price: 27.35 },
      { country: 'Germany', supplier_count: 3, product_count: 7, avg_product_price: 34.21 },
      { country: 'France', supplier_count: 3, product_count: 8, avg_product_price: 44.67 },
      { country: 'UK', supplier_count: 2, product_count: 5, avg_product_price: 36.40 },
      { country: 'Japan', supplier_count: 2, product_count: 4, avg_product_price: 28.50 },
      { country: 'Australia', supplier_count: 2, product_count: 5, avg_product_price: 37.20 },
      { country: 'Italy', supplier_count: 2, product_count: 5, avg_product_price: 22.50 },
      { country: 'Sweden', supplier_count: 2, product_count: 3, avg_product_price: 19.90 },
      { country: 'Canada', supplier_count: 2, product_count: 4, avg_product_price: 18.75 },
      { country: 'Norway', supplier_count: 1, product_count: 3, avg_product_price: 31.23 },
      { country: 'Denmark', supplier_count: 1, product_count: 2, avg_product_price: 17.45 },
      { country: 'Netherlands', supplier_count: 1, product_count: 2, avg_product_price: 10.00 },
    ],
    summary: 'Suppliers span 12 countries. USA leads with 4 suppliers covering 10 products. France has the highest avg product price ($44.67). The Netherlands has the lowest ($10.00).',
    chartSpec: { type: 'bar', data: { labels: ['USA','Germany','France','UK','Japan','Australia','Italy','Sweden','Canada','Norway','Denmark','Netherlands'], datasets: [{ label: 'Number of Suppliers', data: [4,3,3,2,2,2,2,2,2,1,1,1] }] } },
    confidence: 'high', executionTimeMs: 18, rowCount: 12, dryRun: false,
  }),

  /* ── Shippers ────────────────────────────────────────────────── */
  'shipping analysis': () => ({
    sql: `SELECT s.company_name AS shipper, COUNT(o.order_id) AS shipments,\n       ROUND(AVG(o.freight), 2) AS avg_freight,\n       MIN(o.freight) AS min_freight, MAX(o.freight) AS max_freight\nFROM shippers s\nJOIN orders o ON s.shipper_id = o.ship_via\nGROUP BY s.company_name ORDER BY shipments DESC`,
    rows: [
      { shipper: 'United Package', shipments: 326, avg_freight: 80.64, min_freight: 0.15, max_freight: 890.78 },
      { shipper: 'Federal Shipping', shipments: 255, avg_freight: 65.97, min_freight: 0.19, max_freight: 830.75 },
      { shipper: 'Speedy Express', shipments: 249, avg_freight: 65.60, min_freight: 0.12, max_freight: 748.66 },
    ],
    summary: 'United Package handles the most shipments (326) with the highest avg freight ($80.64). All three carriers have extremely wide freight ranges — min near $0, max around $750-$890.',
    chartSpec: { type: 'bar', data: { labels: ['United Package','Federal Shipping','Speedy Express'], datasets: [{ label: 'Total Shipments', data: [326,255,249] }] } },
    confidence: 'high', executionTimeMs: 15, rowCount: 3, dryRun: false,
  }),

  /* ── Orders by country ───────────────────────────────────────── */
  'orders by country': () => ({
    sql: `SELECT o.ship_country, COUNT(o.order_id) AS order_count,\n       SUM(od.unit_price * od.quantity) AS total_value,\n       ROUND(AVG(o.freight), 2) AS avg_freight\nFROM orders o\nJOIN "order_details" od ON o.order_id = od.order_id\nGROUP BY o.ship_country ORDER BY total_value DESC LIMIT 15`,
    rows: [
      { ship_country: 'USA', order_count: 122, total_value: 245584.62, avg_freight: 69.82 },
      { ship_country: 'Germany', order_count: 122, total_value: 230284.63, avg_freight: 75.31 },
      { ship_country: 'Austria', order_count: 40, total_value: 128003.84, avg_freight: 186.38 },
      { ship_country: 'Brazil', order_count: 83, total_value: 114968.48, avg_freight: 52.78 },
      { ship_country: 'France', order_count: 77, total_value: 81930.10, avg_freight: 59.08 },
      { ship_country: 'UK', order_count: 56, total_value: 57382.41, avg_freight: 66.10 },
      { ship_country: 'Ireland', order_count: 19, total_value: 57317.39, avg_freight: 200.21 },
      { ship_country: 'Sweden', order_count: 37, total_value: 55893.24, avg_freight: 44.65 },
      { ship_country: 'Canada', order_count: 30, total_value: 50410.05, avg_freight: 62.44 },
      { ship_country: 'Denmark', order_count: 18, total_value: 33435.50, avg_freight: 40.72 },
      { ship_country: 'Venezuela', order_count: 46, total_value: 30820.30, avg_freight: 42.35 },
      { ship_country: 'Belgium', order_count: 19, total_value: 24245.10, avg_freight: 66.25 },
      { ship_country: 'Switzerland', order_count: 18, total_value: 21537.20, avg_freight: 103.45 },
      { ship_country: 'Finland', order_count: 22, total_value: 18404.65, avg_freight: 32.35 },
      { ship_country: 'Mexico', order_count: 28, total_value: 17072.00, avg_freight: 33.19 },
    ],
    summary: 'USA and Germany tie at 122 orders, but USA edges out in total value ($246K vs $230K). Austria has only 40 orders but $128K in value — 3rd highest — with by far the highest avg freight ($186).',
    chartSpec: { type: 'bar', data: { labels: ['USA','Germany','Austria','Brazil','France','UK','Ireland','Sweden','Canada','Denmark','Venezuela','Belgium','Switzerland','Finland','Mexico'], datasets: [{ label: 'Total Value ($)', data: [245585,230285,128004,114968,81930,57382,57317,55893,50410,33436,30820,24245,21537,18405,17072] }] } },
    confidence: 'high', executionTimeMs: 44, rowCount: 15, dryRun: false,
  }),

  /* ── Inventory / Stock ───────────────────────────────────────── */
  'inventory status': () => ({
    sql: `SELECT p.product_name, c.category_name, p.units_in_stock, p.units_on_order, p.reorder_level,\n       CASE WHEN p.discontinued = 1 THEN 'Yes' ELSE 'No' END AS discontinued,\n       CASE WHEN p.discontinued = 1 THEN 'Discontinued'\n            WHEN p.units_in_stock = 0 THEN 'Out of Stock'\n            WHEN p.units_in_stock <= p.reorder_level THEN 'Reorder Now'\n            ELSE 'In Stock' END AS status\nFROM products p JOIN categories c ON p.category_id = c.category_id\nWHERE p.units_in_stock <= p.reorder_level OR p.discontinued = 1\nORDER BY p.units_in_stock ASC LIMIT 12`,
    rows: [
      { product_name: 'Thüringer Rostbratwurst', category_name: 'Meat/Poultry', units_in_stock: 0, units_on_order: 0, reorder_level: 0, discontinued: 'Yes', status: 'Discontinued' },
      { product_name: 'Perth Pasties', category_name: 'Meat/Poultry', units_in_stock: 0, units_on_order: 0, reorder_level: 0, discontinued: 'Yes', status: 'Discontinued' },
      { product_name: 'Alice Mutton', category_name: 'Meat/Poultry', units_in_stock: 0, units_on_order: 0, reorder_level: 0, discontinued: 'Yes', status: 'Discontinued' },
      { product_name: "Chef Anton's Gumbo Mix", category_name: 'Condiments', units_in_stock: 0, units_on_order: 0, reorder_level: 0, discontinued: 'Yes', status: 'Discontinued' },
      { product_name: 'Guaraná Fantástica', category_name: 'Beverages', units_in_stock: 20, units_on_order: 0, reorder_level: 0, discontinued: 'Yes', status: 'Discontinued' },
      { product_name: 'Genen Shouyu', category_name: 'Condiments', units_in_stock: 39, units_on_order: 0, reorder_level: 5, discontinued: 'Yes', status: 'Discontinued' },
      { product_name: 'Mishi Kobe Niku', category_name: 'Meat/Poultry', units_in_stock: 29, units_on_order: 0, reorder_level: 0, discontinued: 'Yes', status: 'Discontinued' },
      { product_name: 'Gorgonzola Telino', category_name: 'Dairy Products', units_in_stock: 0, units_on_order: 70, reorder_level: 20, discontinued: 'No', status: 'Out of Stock' },
      { product_name: 'Aniseed Syrup', category_name: 'Condiments', units_in_stock: 13, units_on_order: 70, reorder_level: 25, discontinued: 'No', status: 'Reorder Now' },
      { product_name: 'Ipoh Coffee', category_name: 'Beverages', units_in_stock: 17, units_on_order: 10, reorder_level: 25, discontinued: 'No', status: 'Reorder Now' },
      { product_name: 'Nord-Ost Matjeshering', category_name: 'Seafood', units_in_stock: 10, units_on_order: 0, reorder_level: 15, discontinued: 'No', status: 'Reorder Now' },
      { product_name: 'Singaporean Hokkien Fried Mee', category_name: 'Grains/Cereals', units_in_stock: 26, units_on_order: 0, reorder_level: 0, discontinued: 'Yes', status: 'Discontinued' },
    ],
    summary: '8 products discontinued (Meat/Poultry hardest hit with 3). Gorgonzola Telino is out of stock but has 70 units on order. 3 active products need immediate reordering.',
    confidence: 'high', executionTimeMs: 22, rowCount: 12, dryRun: false,
  }),

  'reorder needed': () => ({
    sql: `SELECT p.product_name, p.units_in_stock, p.reorder_level, p.units_on_order,\n       (p.reorder_level - p.units_in_stock) AS shortage,\n       s.company_name AS supplier, s.phone AS supplier_phone\nFROM products p JOIN suppliers s ON p.supplier_id = s.supplier_id\nWHERE p.discontinued = 0 AND p.units_in_stock <= p.reorder_level\nORDER BY shortage DESC`,
    rows: [
      { product_name: 'Gorgonzola Telino', units_in_stock: 0, reorder_level: 20, units_on_order: 70, shortage: 20, supplier: 'Formaggi Fortini s.r.l.', supplier_phone: '(0544) 60323' },
      { product_name: 'Aniseed Syrup', units_in_stock: 13, reorder_level: 25, units_on_order: 70, shortage: 12, supplier: 'Exotic Liquids', supplier_phone: '(171) 555-2222' },
      { product_name: 'Ipoh Coffee', units_in_stock: 17, reorder_level: 25, units_on_order: 10, shortage: 8, supplier: 'Leka Trading', supplier_phone: '555-8787' },
      { product_name: 'Nord-Ost Matjeshering', units_in_stock: 10, reorder_level: 15, units_on_order: 0, shortage: 5, supplier: 'Nord-Ost-Fisch Handelsgesellschaft mbH', supplier_phone: '(04721) 8713' },
    ],
    summary: '4 active products need reordering. Gorgonzola Telino is out of stock (shortage 20) but 70 units on order. Nord-Ost Matjeshering has 0 on order — action needed.',
    confidence: 'high', executionTimeMs: 14, rowCount: 4, dryRun: false,
  }),

  /* ── Territories / Regions ───────────────────────────────────── */
  'territory performance': () => ({
    sql: `SELECT t.territory_description, r.region_description,\n       COUNT(DISTINCT et.employee_id) AS employee_count,\n       COUNT(DISTINCT o.order_id) AS order_count,\n       SUM(od.unit_price * od.quantity) AS total_sales\nFROM territories t\nJOIN region r ON t.region_id = r.region_id\nJOIN employee_territories et ON t.territory_id = et.territory_id\nJOIN orders o ON et.employee_id = o.employee_id\nJOIN "order_details" od ON o.order_id = od.order_id\nGROUP BY t.territory_description, r.region_description ORDER BY total_sales DESC LIMIT 10`,
    rows: [
      { territory_description: 'Wilton', region_description: 'Eastern', employee_count: 2, order_count: 283, total_sales: 463238.75 },
      { territory_description: 'Neward', region_description: 'Eastern', employee_count: 2, order_count: 253, total_sales: 415195.01 },
      { territory_description: 'Seattle', region_description: 'Western', employee_count: 2, order_count: 227, total_sales: 379893.00 },
      { territory_description: 'London', region_description: 'Northern', employee_count: 4, order_count: 224, total_sales: 373741.00 },
      { territory_description: 'New York', region_description: 'Eastern', employee_count: 1, order_count: 156, total_sales: 250187.45 },
      { territory_description: 'Redmond', region_description: 'Western', employee_count: 1, order_count: 156, total_sales: 250187.45 },
      { territory_description: 'Westboro', region_description: 'Eastern', employee_count: 1, order_count: 127, total_sales: 213051.30 },
      { territory_description: 'Bedford', region_description: 'Eastern', employee_count: 1, order_count: 123, total_sales: 202143.71 },
      { territory_description: 'Cambridge', region_description: 'Eastern', employee_count: 1, order_count: 104, total_sales: 177749.26 },
      { territory_description: 'Tacoma', region_description: 'Western', employee_count: 1, order_count: 96, total_sales: 166537.75 },
    ],
    summary: 'Eastern region dominates (6 of top 10). Wilton leads at $463K (2 employees, 283 orders). London in Northern has the most employees (4) covering $374K.',
    chartSpec: { type: 'bar', data: { labels: ['Wilton','Neward','Seattle','London','New York','Redmond','Westboro','Bedford','Cambridge','Tacoma'], datasets: [{ label: 'Total Sales ($)', data: [463239,415195,379893,373741,250187,250187,213051,202144,177749,166538] }] } },
    confidence: 'high', executionTimeMs: 67, rowCount: 10, dryRun: false,
  }),

  /* ── Customer Demographics ───────────────────────────────────── */
  'customer demographics': () => ({
    sql: `SELECT c.country, COUNT(c.customer_id) AS customer_count,\n       COUNT(DISTINCT o.order_id) AS total_orders,\n       ROUND(SUM(od.unit_price * od.quantity), 2) AS total_spend,\n       ROUND(AVG(od.unit_price * od.quantity), 2) AS avg_order_value\nFROM customers c\nJOIN orders o ON c.customer_id = o.customer_id\nJOIN "order_details" od ON o.order_id = od.order_id\nGROUP BY c.country ORDER BY total_spend DESC LIMIT 10`,
    rows: [
      { country: 'USA', customer_count: 13, total_orders: 122, total_spend: 245584.62, avg_order_value: 587.52 },
      { country: 'Germany', customer_count: 11, total_orders: 122, total_spend: 230284.63, avg_order_value: 568.18 },
      { country: 'Austria', customer_count: 2, total_orders: 40, total_spend: 128003.84, avg_order_value: 1025.63 },
      { country: 'Brazil', customer_count: 9, total_orders: 83, total_spend: 114968.48, avg_order_value: 412.40 },
      { country: 'France', customer_count: 11, total_orders: 77, total_spend: 81930.10, avg_order_value: 348.85 },
      { country: 'UK', customer_count: 7, total_orders: 56, total_spend: 57382.41, avg_order_value: 340.37 },
      { country: 'Ireland', customer_count: 1, total_orders: 19, total_spend: 57317.39, avg_order_value: 1034.07 },
      { country: 'Sweden', customer_count: 2, total_orders: 37, total_spend: 55893.24, avg_order_value: 567.70 },
      { country: 'Canada', customer_count: 3, total_orders: 30, total_spend: 50410.05, avg_order_value: 479.14 },
      { country: 'Denmark', customer_count: 2, total_orders: 18, total_spend: 33435.50, avg_order_value: 594.92 },
    ],
    summary: 'USA leads (13 customers, $246K spend). Austria and Ireland have the highest avg order values ($1,026 and $1,034) despite only 2 and 1 customer(s) — high-value enterprise accounts.',
    chartSpec: { type: 'bar', data: { labels: ['USA','Germany','Austria','Brazil','France','UK','Ireland','Sweden','Canada','Denmark'], datasets: [{ label: 'Total Spend ($)', data: [245585,230285,128004,114968,81930,57382,57317,55893,50410,33436] }] } },
    confidence: 'high', executionTimeMs: 48, rowCount: 10, dryRun: false,
  }),

  /* ── Discount Analysis ───────────────────────────────────────── */
  'discount analysis': () => ({
    sql: `SELECT \n  CASE WHEN od.discount = 0 THEN 'No Discount'\n       WHEN od.discount <= 0.05 THEN '1-5%'\n       WHEN od.discount <= 0.10 THEN '6-10%'\n       WHEN od.discount <= 0.15 THEN '11-15%'\n       WHEN od.discount <= 0.20 THEN '16-20%'\n       ELSE '21%+' END AS discount_band,\n  COUNT(*) AS line_items,\n  ROUND(SUM(od.unit_price * od.quantity), 2) AS gross_revenue,\n  ROUND(SUM(od.unit_price * od.quantity * od.discount), 2) AS discount_given\nFROM "order_details" od GROUP BY discount_band ORDER BY discount_band`,
    rows: [
      { discount_band: 'No Discount', line_items: 1317, gross_revenue: 851039.20, discount_given: 0.00 },
      { discount_band: '1-5%', line_items: 185, gross_revenue: 111448.80, discount_given: 5572.44 },
      { discount_band: '6-10%', line_items: 173, gross_revenue: 112375.60, discount_given: 11237.56 },
      { discount_band: '11-15%', line_items: 157, gross_revenue: 101220.30, discount_given: 15183.05 },
      { discount_band: '16-20%', line_items: 161, gross_revenue: 108745.50, discount_given: 21749.10 },
      { discount_band: '21%+', line_items: 162, gross_revenue: 94784.00, discount_given: 23696.00 },
    ],
    summary: '61% of line items (1,317) have no discount ($851K revenue). Discounted items total $528K gross with $77K given as discounts. The 21%+ band has the highest total discount ($23.7K).',
    chartSpec: { type: 'pie', data: { labels: ['No Discount','1-5%','6-10%','11-15%','16-20%','21%+'], datasets: [{ label: 'Line Items', data: [1317,185,173,157,161,162] }] } },
    confidence: 'high', executionTimeMs: 29, rowCount: 6, dryRun: false,
  }),
};

function findResponse(question: string): any {
  const q = question.toLowerCase();
  if (q.includes('top') && q.includes('customer')) return RESPONSES['top 10 customers']();
  if (q.includes('monthly') && q.includes('revenue')) return RESPONSES['monthly revenue']();
  if (q.includes('quarter') || q.includes('quarterly') || q.includes('trend')) return RESPONSES['quarterly trends']();
  if ((q.includes('average') || q.includes('avg')) && q.includes('order') && q.includes('value')) return RESPONSES['avg order value']();
  if (q.includes('aov')) return RESPONSES['avg order value']();
  if (q.includes('categor')) return RESPONSES['categories']();
  if (q.includes('late') || q.includes('overdue') || q.includes('delayed')) return RESPONSES['late orders']();
  if (q.includes('employee') || q.includes('sales rep') || q.includes('processed')) return RESPONSES['employees']();
  if (q.includes('expensive') || (q.includes('product') && q.includes('price'))) return RESPONSES['expensive products']();
  if (q.includes('product') && (q.includes('perform') || q.includes('best') || q.includes('top') || q.includes('revenue'))) return RESPONSES['product performance']();
  if (q.includes('supplier')) return RESPONSES['suppliers by country']();
  if (q.includes('ship') && (q.includes('analysis') || q.includes('freight') || q.includes('carrier'))) return RESPONSES['shipping analysis']();
  if (q.includes('country') && (q.includes('order') || q.includes('ship'))) return RESPONSES['orders by country']();
  if (q.includes('inventory') || q.includes('stock') || q.includes('discontinued')) return RESPONSES['inventory status']();
  if (q.includes('territory') || q.includes('region')) return RESPONSES['territory performance']();
  if (q.includes('demographic') || (q.includes('customer') && q.includes('country'))) return RESPONSES['customer demographics']();
  if (q.includes('discount')) return RESPONSES['discount analysis']();
  if (q.includes('reorder') || q.includes('low stock') || q.includes('out of stock')) return RESPONSES['reorder needed']();

  // Fallback — orders by country is a rich default
  return RESPONSES['orders by country']();
}

export async function POST(request: NextRequest) {
  let body: { question?: string; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = body.question;
  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'Missing "question" field' }, { status: 400 });
  }

  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 500));

  const result = findResponse(question);

  if (body.dryRun) {
    return NextResponse.json({
      ...result,
      rows: [],
      rowCount: 0,
      dryRun: true,
      summary: 'Dry-run preview — SQL generated but not executed.',
    });
  }

  return NextResponse.json(result);
}
