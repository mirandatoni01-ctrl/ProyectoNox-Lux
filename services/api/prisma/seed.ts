/**
 * NOX & LUX API — Seed de base de datos (NL-04, extendido en NL-07).
 * Puebla PostgreSQL con:
 *  1. Catálogo de demostración (Product → Variants → Inventory → Images),
 *     mapeado desde el catálogo del MVP (INITIAL_PRODUCTS en apps/store).
 *  2. Roles y permisos base de RBAC (SECURITY_MODEL.md). NL-07 añade
 *     `productos:eliminar` (DELETE de catálogo); NL-08 añade `inventario:ver`.
 *  3. Primer administrador (NL-07): `admin@noxlux.test`, rol SUPER_ADMIN,
 *     para operar el panel contra la BD real. Contraseña desde
 *     `SEED_ADMIN_PASSWORD` (por defecto, de desarrollo).
 *
 * Idempotente: usa upsert por slug/sku/code/email → puede ejecutarse varias veces.
 */
import 'dotenv/config';
import { PrismaClient, Material, RoleCode } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';

// Prisma 7 sin engine nativo: se conecta vía driver adapter (pg).
// La URL llega desde services/api/.env (dotenv via prisma.config / entorno).
// El seed se ejecuta dentro del workspace @nox-lux/api (cwd = services/api).
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Catálogo de demostración (equivalente a INITIAL_PRODUCTS del MVP). */
interface SeedProduct {
  name: string;
  category: 'anillos' | 'cadenas' | 'aretes' | 'pulseras';
  basePrice: number;
  material: Material;
  description: string;
  imageUrl: string;
  variants: { material: Material; size: string; stock: number; priceOverride: number }[];
}

const PRODUCTS: SeedProduct[] = [
  {
    name: 'ANILLO HELIOS LUX',
    category: 'anillos',
    basePrice: 45.0,
    material: 'COVERGOLD',
    description:
      'Anillo geométrica con triple baño de Covergold de 24k. Acabado espejado de máxima durabilidad y diseño anatómico.',
    imageUrl:
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600',
    variants: [
      { material: 'COVERGOLD', size: 'Talla 6', stock: 12, priceOverride: 45.0 },
      { material: 'COVERGOLD', size: 'Talla 7', stock: 8, priceOverride: 45.0 },
      { material: 'COVERGOLD', size: 'Talla 8', stock: 0, priceOverride: 45.0 },
    ],
  },
  {
    name: 'CADENA CHOKER NOX',
    category: 'cadenas',
    basePrice: 62.0,
    material: 'STAINLESS_STEEL',
    description:
      'Choker de eslabones pulidos en Acero Inoxidable 316L. Inalterable al agua, perfumes y sudor.',
    imageUrl:
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
    variants: [
      { material: 'STAINLESS_STEEL', size: '40 cm', stock: 15, priceOverride: 62.0 },
      { material: 'STAINLESS_STEEL', size: '45 cm', stock: 20, priceOverride: 62.0 },
    ],
  },
  {
    name: 'PULSERA EOS RHODIUM',
    category: 'pulseras',
    basePrice: 38.0,
    material: 'RHODIUM',
    description:
      'Brazalete rígido articulado con recubrimiento electrolítico en Rodio blanco ultrabrillante.',
    imageUrl:
      'https://images.unsplash.com/photo-1611591475140-be3617c97886?auto=format&fit=crop&q=80&w=600',
    variants: [{ material: 'RHODIUM', size: 'Ajustable', stock: 6, priceOverride: 38.0 }],
  },
  {
    name: 'ARETES ORBITA MINIMAL',
    category: 'aretes',
    basePrice: 28.0,
    material: 'COVERGOLD',
    description:
      'Argollas tubulares ligeras con cierre de seguridad. Baño protector anti-alérgico en Covergold.',
    imageUrl:
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=600',
    variants: [
      { material: 'COVERGOLD', size: '15 mm', stock: 18, priceOverride: 28.0 },
      { material: 'COVERGOLD', size: '20 mm', stock: 5, priceOverride: 32.0 },
    ],
  },
  {
    name: 'ANILLO SOMBRA MATTE',
    category: 'anillos',
    basePrice: 34.0,
    material: 'STAINLESS_STEEL',
    description: 'Banda ancha cepillada en acero inoxidable con bisel pulido brillante.',
    imageUrl:
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&q=80&w=600',
    variants: [
      { material: 'STAINLESS_STEEL', size: 'Talla 8', stock: 14, priceOverride: 34.0 },
      { material: 'STAINLESS_STEEL', size: 'Talla 9', stock: 2, priceOverride: 34.0 },
    ],
  },
  {
    name: 'DIJE MEDALLA RODIO',
    category: 'cadenas',
    basePrice: 54.0,
    material: 'RHODIUM',
    description:
      'Medallón grabado con patrón geométrico en acabado rodiado de alta intensidad visual.',
    imageUrl:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=600',
    variants: [{ material: 'RHODIUM', size: '50 cm', stock: 9, priceOverride: 54.0 }],
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedProducts(): Promise<void> {
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        name: p.name,
        slug,
        category: p.category,
        description: p.description,
        basePrice: p.basePrice,
        materialDefault: p.material,
        isActive: true,
      },
    });

    // Imagen principal del producto (ADR-NL-015 → Object Storage en NL-09).
    // ProductImage.id es uuid: se actualiza la imagen primaria existente si la
    // hay, si no se crea (idempotente, sin id compuesto).
    const primary = await prisma.productImage.findFirst({
      where: { productId: product.id, isPrimary: true },
    });
    if (primary) {
      await prisma.productImage.update({
        where: { id: primary.id },
        data: { url: p.imageUrl, alt: p.name },
      });
    } else {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: p.imageUrl,
          alt: p.name,
          position: 0,
          isPrimary: true,
        },
      });
    }

    // Variantes + inventario por variant.
    for (const [idx, v] of p.variants.entries()) {
      const sku = `${slug.toUpperCase()}-${String(idx + 1).padStart(2, '0')}`;
      const variant = await prisma.productVariant.upsert({
        where: { sku },
        update: { material: v.material, size: v.size, priceOverride: v.priceOverride },
        create: {
          productId: product.id,
          sku,
          material: v.material,
          size: v.size,
          priceOverride: v.priceOverride,
          status: 'active',
        },
      });

      await prisma.inventory.upsert({
        where: { productVariantId: variant.id },
        update: { stockOnHand: v.stock },
        create: { productVariantId: variant.id, stockOnHand: v.stock, reserved: 0 },
      });
    }
  }
}

async function seedRbac(): Promise<void> {
  const permissions = [
    { code: 'productos:ver', name: 'Ver productos' },
    { code: 'productos:crear', name: 'Crear productos' },
    { code: 'productos:editar', name: 'Editar productos' },
    { code: 'productos:eliminar', name: 'Eliminar productos' },
    { code: 'inventario:ver', name: 'Ver inventario' },
    { code: 'inventario:editar', name: 'Editar inventario' },
    { code: 'pedidos:ver', name: 'Ver pedidos' },
    { code: 'pedidos:gestionar', name: 'Gestionar pedidos' },
    { code: 'clientes:ver', name: 'Ver clientes' },
    { code: 'clientes:gestionar', name: 'Gestionar clientes' },
    { code: 'media:ver', name: 'Ver media' },
    { code: 'media:subir', name: 'Subir imágenes' },
    { code: 'media:eliminar', name: 'Eliminar imágenes' },
    { code: 'usuarios:ver', name: 'Ver usuarios' },
    { code: 'usuarios:gestionar', name: 'Gestionar usuarios' },
    { code: 'tickets:ver', name: 'Ver tickets' },
    { code: 'tickets:gestionar', name: 'Gestionar tickets' },
    { code: 'auditoria:ver', name: 'Ver auditoría' },
  ];

  const permMap: Record<string, string> = {};
  for (const perm of permissions) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name },
      create: { code: perm.code, name: perm.name },
    });
    permMap[p.code] = p.id;
  }

  // SUPER_ADMIN: todos los permisos.
  const superAdmin = await prisma.role.upsert({
    where: { code: RoleCode.SUPER_ADMIN },
    update: {},
    create: { code: RoleCode.SUPER_ADMIN, name: 'Super Admin', description: 'Acceso total' },
  });
  for (const id of Object.values(permMap)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: id } },
      update: {},
      create: { roleId: superAdmin.id, permissionId: id },
    });
  }

  // ADMIN: operación completa (productos, inventario, pedidos, clientes, media).
  const admin = await prisma.role.upsert({
    where: { code: RoleCode.ADMIN },
    update: {},
    create: { code: RoleCode.ADMIN, name: 'Admin', description: 'Operación completa' },
  });
  const adminCodes = permissions
    .filter((p) => p.code !== 'usuarios:gestionar' && p.code !== 'auditoria:ver')
    .map((p) => p.code);
  for (const code of adminCodes) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: permMap[code] } },
      update: {},
      create: { roleId: admin.id, permissionId: permMap[code] },
    });
  }

  // CUSTOMER (NL-13): comprador del Store. Sin permisos de panel; el acceso a
  // su propio perfil/historial/tickets va autenticado por JWT (no RBAC).
  await prisma.role.upsert({
    where: { code: RoleCode.CUSTOMER },
    update: {},
    create: {
      code: RoleCode.CUSTOMER,
      name: 'Cliente',
      description: 'Comprador registrado de la tienda',
    },
  });
}

/**
 * Primer administrador (NL-07): sin él no hay forma de iniciar sesión en el
 * panel (register exige un SUPER_ADMIN ya autenticado → bootstrap de arranque).
 * SOLO-DESARROLLO: el email/contraseña se documentan y la contraseña por
 * defecto debe cambiarse vía POST /api/auth/... o con el gestor del Admin.
 */
async function seedAdminUser(): Promise<void> {
  const email = 'admin@noxlux.test';
  // NL-12: en producción SEED_ADMIN_PASSWORD es obligatorio (no se emite el
  // email/contraseña por defecto de desarrollo en el mensaje de arranque).
  const isProduction = process.env.NODE_ENV === 'production';
  const plain = process.env.SEED_ADMIN_PASSWORD ?? (isProduction ? null : 'AdminNoxLux123!');
  if (!plain) {
    throw new Error(
      'NODE_ENV=production sin SEED_ADMIN_PASSWORD: define una contraseña explícita (fail-fast NL-12)',
    );
  }
  if (plain.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD debe tener al menos 12 caracteres');
  }
  const passwordHash = await hash(plain);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: {
      email,
      passwordHash,
      fullName: 'Administrador NOX & LUX',
      roles: { create: { role: { connect: { code: RoleCode.SUPER_ADMIN } } } },
    },
  });
  const log = isProduction
    ? `Admin listo: ${email} (contraseña desde SEED_ADMIN_PASSWORD).`
    : `Admin SOLO-DESARROLLO listo: ${email} (cambia la contraseña por defecto).`;
  console.log(log);
}

async function main(): Promise<void> {
  await seedProducts();
  await seedRbac();
  await seedAdminUser();
}

main()
  .then(async () => {
    console.log('Seed completado (catálogo + roles/permisos).');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
