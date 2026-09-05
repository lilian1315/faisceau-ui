import {
  createCombobox,
  createSelect,
  enhanceCombobox,
  enhanceSelect,
} from "@lilian1315/faisceau-ui";
import "@lilian1315/faisceau-ui/styles.css";
import "./styles.css";

const cities = [
  { value: "paris", label: "Paris", description: "Île-de-France" },
  { value: "lyon", label: "Lyon", description: "Auvergne-Rhône-Alpes" },
  { value: "bordeaux", label: "Bordeaux", description: "Nouvelle-Aquitaine" },
  { value: "lille", label: "Lille", description: "Hauts-de-France" },
  { value: "nantes", label: "Nantes", description: "Pays de la Loire" },
  { value: "rennes", label: "Rennes", description: "Bretagne" },
] as const;

const eventOutput = requireElement<HTMLElement>("#demo-events");

createSelect({
  clearable: true,
  defaultValue: ["fr"],
  description: "Le Select utilise une liste fermée et supporte la navigation clavier.",
  items: [
    { value: "fr", label: "France" },
    { value: "be", label: "Belgique" },
    { value: "ch", label: "Suisse" },
    { value: "ca", label: "Canada" },
    { value: "mc", label: "Monaco", disabled: true },
  ],
  label: "Pays",
  name: "country",
  onValueChange({ items }) {
    eventOutput.textContent = `Pays sélectionné : ${items[0]?.label ?? "aucun"}`;
  },
  placeholder: "Choisir un pays",
}).mount(requireElement("#created-select"));

enhanceSelect(requireElement<HTMLElement>("#enhanced-select"), {
  placeholder: "Choisir un environnement",
});

createCombobox({
  description: "Saisissez quelques lettres pour filtrer les suggestions.",
  emptyLabel: "Aucune ville trouvée",
  items: cities,
  label: "Ville",
  name: "city",
  onValueChange({ items }) {
    eventOutput.textContent = `Ville sélectionnée : ${items[0]?.label ?? "aucune"}`;
  },
  placeholder: "Rechercher une ville…",
}).mount(requireElement("#created-combobox"));

enhanceCombobox(requireElement<HTMLElement>("#enhanced-combobox"), {
  emptyLabel: "Aucune commande trouvée",
  placeholder: "Rechercher une commande…",
});

const themeButton = requireElement<HTMLButtonElement>("#theme-toggle");
themeButton.addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.fuiTheme !== "dark";
  root.dataset.fuiTheme = dark ? "dark" : "light";
  themeButton.textContent = dark ? "Passer au thème clair" : "Passer au thème sombre";
});

function requireElement<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing demo element: ${selector}`);
  return element;
}
