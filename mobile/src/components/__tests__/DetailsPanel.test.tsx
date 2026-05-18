import { render } from "@testing-library/react-native"
import { DetailsPanel } from "../DetailsPanel"
import type { LeafSchema } from "../../lib/api/types"

const PIZZA: LeafSchema = {
  handle: "food.pizza",
  display_name: "Pizza",
  parent: "food",
  core_fields: [
    { key: "size_in", label: "Size", type: "enum", required: true, options: ["10", "12"] },
    { key: "toppings", label: "Toppings", type: "string[]", required: false },
    { key: "prep_min", label: "Prep time (min)", type: "number", required: true, hint: "For shop ETA — not shown on product" },
    { key: "is_vegan", label: "Vegan", type: "boolean", required: false },
  ],
}

describe("DetailsPanel", () => {
  it("renders core_fields in schema order with their values", () => {
    const { queryByText } = render(
      <DetailsPanel
        schema={PIZZA}
        coreFields={{ size_in: "12", toppings: ["basil", "tomato"], prep_min: 18, is_vegan: false }}
        customFields={{ gluten_free: true }}
      />
    )
    expect(queryByText("Details")).toBeTruthy()
    expect(queryByText("Size")).toBeTruthy()
    expect(queryByText("12")).toBeTruthy()
    expect(queryByText("Toppings")).toBeTruthy()
    expect(queryByText("basil, tomato")).toBeTruthy()
    expect(queryByText("Prep time (min)")).toBeNull() // hidden by hint
    expect(queryByText("18")).toBeNull()
    expect(queryByText("Vegan")).toBeTruthy()
    expect(queryByText("Extras")).toBeTruthy()
    expect(queryByText("gluten_free")).toBeTruthy()
  })

  it("hides fields where value is undefined", () => {
    const { queryByText } = render(
      <DetailsPanel schema={PIZZA} coreFields={{ size_in: "12", prep_min: 18 }} customFields={{}} />
    )
    expect(queryByText("Toppings")).toBeNull()
    expect(queryByText("Vegan")).toBeNull()
  })

  it("omits Extras section when customFields is empty", () => {
    const { queryByText } = render(
      <DetailsPanel schema={PIZZA} coreFields={{ size_in: "12", prep_min: 18 }} customFields={{}} />
    )
    expect(queryByText("Extras")).toBeNull()
  })
})
