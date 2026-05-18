import type { LeafSchema } from "./types"

// Eager-imports all 32 leaf schemas. Add new schemas here as the taxonomy grows.

import { schema as foodPizza } from "./schemas/food.pizza"
import { schema as foodBurger } from "./schemas/food.burger"
import { schema as foodSalad } from "./schemas/food.salad"
import { schema as foodPasta } from "./schemas/food.pasta"
import { schema as foodDessert } from "./schemas/food.dessert"
import { schema as foodDrink } from "./schemas/food.drink"
import { schema as groceryRice } from "./schemas/grocery.rice"
import { schema as groceryDairy } from "./schemas/grocery.dairy"
import { schema as groceryEggs } from "./schemas/grocery.eggs"
import { schema as groceryFruit } from "./schemas/grocery.fruit"
import { schema as groceryVegetable } from "./schemas/grocery.vegetable"
import { schema as groceryOil } from "./schemas/grocery.oil"
import { schema as groceryBakery } from "./schemas/grocery.bakery"
import { schema as grocerySnack } from "./schemas/grocery.snack"
import { schema as fashionShirt } from "./schemas/fashion.shirt"
import { schema as fashionPants } from "./schemas/fashion.pants"
import { schema as fashionJacket } from "./schemas/fashion.jacket"
import { schema as fashionDress } from "./schemas/fashion.dress"
import { schema as fashionShoes } from "./schemas/fashion.shoes"
import { schema as fashionAccessory } from "./schemas/fashion.accessory"
import { schema as electronicsHeadphones } from "./schemas/electronics.headphones"
import { schema as electronicsEarbuds } from "./schemas/electronics.earbuds"
import { schema as electronicsCharging } from "./schemas/electronics.charging"
import { schema as electronicsSmartwatch } from "./schemas/electronics.smartwatch"
import { schema as electronicsPowerBank } from "./schemas/electronics.power-bank"
import { schema as homeCookware } from "./schemas/home.cookware"
import { schema as homeBathTextiles } from "./schemas/home.bath-textiles"
import { schema as homeBedding } from "./schemas/home.bedding"
import { schema as homeCleaning } from "./schemas/home.cleaning"
import { schema as homeDecor } from "./schemas/home.decor"
import { schema as homeAppliance } from "./schemas/home.appliance"
import { schema as homeFrames } from "./schemas/home.frames"

const ALL_SCHEMAS: LeafSchema[] = [
  foodPizza, foodBurger, foodSalad, foodPasta, foodDessert, foodDrink,
  groceryRice, groceryDairy, groceryEggs, groceryFruit, groceryVegetable, groceryOil, groceryBakery, grocerySnack,
  fashionShirt, fashionPants, fashionJacket, fashionDress, fashionShoes, fashionAccessory,
  electronicsHeadphones, electronicsEarbuds, electronicsCharging, electronicsSmartwatch, electronicsPowerBank,
  homeCookware, homeBathTextiles, homeBedding, homeCleaning, homeDecor, homeAppliance, homeFrames,
]

const BY_HANDLE = new Map<string, LeafSchema>(ALL_SCHEMAS.map((s) => [s.handle, s]))

export function getSchemaByHandle(handle: string): LeafSchema | null {
  return BY_HANDLE.get(handle) ?? null
}

export function listAllSchemas(): LeafSchema[] {
  return [...ALL_SCHEMAS]
}

export function listSectionLeaves(sectionHandle: string): LeafSchema[] {
  return ALL_SCHEMAS.filter((s) => s.handle.startsWith(`${sectionHandle}.`))
}
