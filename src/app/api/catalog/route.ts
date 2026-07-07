import { NextResponse } from "next/server";
import { db } from "@/db";
import { services, serviceItems, concreteTypes, materials, machines } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // Concrete types
  const concrete = await db.select().from(concreteTypes).where(eq(concreteTypes.active, true)).all();

  // Machines
  const machineList = await db.select().from(machines).all();

  // Materials
  const materialList = await db.select().from(materials).all();

  // Services with items
  const servicesList = await db.select().from(services).where(eq(services.active, true)).all();

  // Load all items for all services
  const allItems = await db.select({
    id: serviceItems.id,
    serviceId: serviceItems.serviceId,
    concreteTypeId: serviceItems.concreteTypeId,
    materialId: serviceItems.materialId,
    machineId: serviceItems.machineId,
    actionName: serviceItems.actionName,
    description: serviceItems.description,
    quantity: serviceItems.quantity,
    unit: serviceItems.unit,
    pricePerUnit: serviceItems.pricePerUnit,
    sortOrder: serviceItems.sortOrder,
    concreteTypeName: concreteTypes.name,
    concreteTypePrice: concreteTypes.pricePerM3,
    materialName: materials.name,
    machineName: machines.name,
    machineType: machines.type,
  })
    .from(serviceItems)
    .leftJoin(concreteTypes, eq(serviceItems.concreteTypeId, concreteTypes.id))
    .leftJoin(materials, eq(serviceItems.materialId, materials.id))
    .leftJoin(machines, eq(serviceItems.machineId, machines.id))
    .orderBy(asc(serviceItems.sortOrder))
    .all();

  // Group items by service
  const itemsByService: Record<number, any[]> = {};
  for (const item of allItems) {
    if (!itemsByService[item.serviceId]) itemsByService[item.serviceId] = [];
    itemsByService[item.serviceId].push(item);
  }

  const catalog = {
    concreteTypes: concrete,
    machines: machineList,
    materials: materialList,
    services: servicesList.map(s => ({
      ...s,
      variants: itemsByService[s.id] || [],
    })),
    // Flat list of all selectable items for dropdowns
    allVariants: allItems.map(item => {
      const service = servicesList.find(s => s.id === item.serviceId);
      return {
        id: item.id,
        serviceId: item.serviceId,
        serviceName: service?.name || "",
        label: [
          service?.name || "",
          item.actionName || "",
          item.description || "",
          item.concreteTypeName ? `(${item.concreteTypeName})` : "",
          item.machineName ? `[${item.machineName}]` : "",
        ].filter(Boolean).join(" "),
        description: item.description || "",
        unit: item.unit,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        concreteTypeId: item.concreteTypeId,
        materialId: item.materialId,
        machineId: item.machineId,
        total: item.quantity * (item.pricePerUnit || 0),
      };
    }),
  };

  return NextResponse.json(catalog);
}
