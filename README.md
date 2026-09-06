# Faisceau UI

Faisceau UI est une bibliothèque de composants DOM accessibles pour navigateurs modernes. Elle associe les machines d'état de [Zag.js](https://zagjs.com/) à [`@lilian1315/create-element`](https://github.com/lilian1315/create-element) et [`faisceau`](https://github.com/lilian1315/faisceau), sans dépendre d'un framework. Son apparence s'inspire de shadcn/ui, avec du CSS vanilla, les icônes open source de [Lucide](https://lucide.dev/) et des classes internes préfixées par `fui-`.

Le premier lot fournit un Select et une Combobox. Chaque composant peut construire son propre DOM ou adopter un markup HTML déjà présent.

## Architecture

Le monorepo contient deux bibliothèques publiables :

- `@lilian1315/faisceau-zag` : pont générique entre une machine Zag, les valeurs réactives Faisceau et des éléments DOM. Il gère le cycle de vie, les mises à jour et l'application réactive des props Zag.
- `@lilian1315/faisceau-ui` : composants, markup et styles. Il utilise le pont précédent et les machines `@zag-js/select` et `@zag-js/combobox`.

Le package privé `website` sert uniquement de démonstration locale.

## Installation

```bash
pnpm add @lilian1315/faisceau-ui
```

Importer une fois la feuille de styles globale depuis le point d'entrée de l'application :

```ts
import "@lilian1315/faisceau-ui/styles.css";
```

Les composants sont aussi disponibles depuis les sous-chemins `@lilian1315/faisceau-ui/select` et `@lilian1315/faisceau-ui/combobox`.

Pour utiliser directement le pont de bas niveau :

```bash
pnpm add @lilian1315/faisceau-zag @zag-js/vanilla faisceau
```

Le pont suit l'adapter Vanilla officiel et déclare ses runtimes en peer dependencies. Cette version est testée avec `@zag-js/vanilla` 1.43.x et `faisceau` 0.3.x. Le projet cible uniquement les navigateurs modernes ; le rendu serveur ne fait pas partie de son contrat.

## Créer un Select

`createSelect` construit le markup avec `@lilian1315/create-element/faisceau`. Le contrôleur reste arrêté jusqu'à son montage :

```ts
import { createSelect } from "@lilian1315/faisceau-ui";
import "@lilian1315/faisceau-ui/styles.css";

const select = createSelect({
  label: "Mode d'affichage",
  placeholder: "Choisir un mode",
  clearable: true,
  name: "display-mode",
  items: [
    { value: "simple", label: "Simple" },
    {
      value: "expert",
      label: "Expert",
      description: "Affiche tous les réglages",
    },
    { value: "legacy", label: "Historique", disabled: true },
  ],
});

select.mount(document.querySelector("#app")!);
```

Une chaîne peut servir de raccourci d'item ; sa valeur et son libellé seront identiques.

Par défaut, le menu chevauche le contrôle à l'ouverture afin d'aligner le texte de l'option sélectionnée avec la valeur affichée. Si aucun item n'est sélectionné, le menu reprend son positionnement sous le trigger. Utilisez `alignItemWithTrigger: false` pour toujours placer le menu sous le trigger. Ce positionnement est toujours désactivé lorsque `multiple: true`, même si `alignItemWithTrigger: true` est fourni explicitement. L'option fonctionne aussi avec `enhanceSelect`. Comme dans Base UI, l'ancre, le décalage et le placement sont gérés par ce mode spécial ; les autres options de `positioning` restent applicables.

## Créer une Combobox

La Combobox filtre par défaut les libellés sans tenir compte de la casse. Une fonction `filter` permet de remplacer ce comportement.

```ts
import { createCombobox } from "@lilian1315/faisceau-ui";

const combobox = createCombobox({
  label: "Commande",
  placeholder: "Rechercher une commande",
  emptyLabel: "Aucun résultat",
  items: [
    { value: "build", label: "Build" },
    { value: "test", label: "Test" },
    { value: "deploy", label: "Déployer", disabled: true },
  ],
});

combobox.mount(document.querySelector("#app")!);
```

## Sélection multiple

Les deux composants acceptent `multiple: true`. Un Select affiche les libellés sélectionnés dans son trigger et garde sa liste ouverte pour permettre plusieurs choix. Une Combobox affiche chaque valeur sélectionnée sous forme de pastille retirable et vide son champ après une sélection afin de poursuivre la recherche.

```ts
createSelect({
  label: "Pays",
  name: "countries",
  multiple: true,
  defaultValue: ["fr", "be"],
  items: [
    { value: "fr", label: "France" },
    { value: "be", label: "Belgique" },
    { value: "ch", label: "Suisse" },
  ],
}).mount(document.querySelector("#countries")!);

createCombobox({
  label: "Villes",
  name: "cities",
  multiple: true,
  getRemoveLabel: (item) => `Retirer ${item.label}`,
  items: [
    { value: "paris", label: "Paris" },
    { value: "lyon", label: "Lyon" },
    { value: "lille", label: "Lille" },
  ],
}).mount(document.querySelector("#cities")!);
```

En mode enhance, l'attribut HTML natif suffit : `<select multiple>`. Les options portant `selected` deviennent les valeurs initiales. Pour récupérer toutes les valeurs d'un formulaire, utilisez `new FormData(form).getAll(name)`.

## Formulaires HTML natifs

Select et Combobox gardent un véritable `<select>` dans le document. Le contrôle natif porte le `name`, participe à `FormData`, applique `required` et `disabled`, et retrouve sa valeur initiale lors de `form.reset()`. Pour une Combobox, la valeur soumise est bien la valeur de l'option, pas son libellé visible.

Une sélection effectuée depuis l'interface visuelle émet les événements natifs bouillonnants `input`, puis `change`, sur ce `<select>`. Les listeners déjà attachés à un markup amélioré continuent donc de fonctionner. Si la validation native échoue, le focus est transféré vers le trigger du Select ou le champ de la Combobox.

```ts
const form = document.querySelector<HTMLFormElement>("#profile")!;

createCombobox({
  label: "Ville",
  name: "city",
  required: true,
  items: [
    { value: "paris", label: "Paris" },
    { value: "lyon", label: "Lyon" },
  ],
}).mount(form);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  console.log(new FormData(form).get("city"));
});
```

## Améliorer un markup existant

Les fonctions `enhanceSelect` et `enhanceCombobox` demandent seulement un conteneur avec un `<select>` natif et ses `<option>`. Le script lit les options, génère le label, le contrôle, la liste et les icônes, puis démarre immédiatement le composant. Le `<select>` fourni reste le contrôle du formulaire.

### Select existant

```html
<form id="settings">
  <div id="mode-select">
    <select name="display-mode" aria-label="Mode d'affichage" required>
      <option value="">Choisir un mode</option>
      <option value="simple" selected>Simple</option>
      <option value="expert" data-description="Affiche tous les réglages">Expert</option>
    </select>
  </div>
</form>
```

```ts
import { enhanceSelect } from "@lilian1315/faisceau-ui";

const select = enhanceSelect(document.querySelector<HTMLElement>("#mode-select")!, {
  clearable: true,
});
```

Le label visible vient de `aria-label`, la valeur initiale de l'option `selected` et le placeholder de l'option dont la valeur est vide. Chacun peut aussi être remplacé avec les options `label`, `defaultValue` et `placeholder`.

### Combobox existante

```html
<div id="command-combobox">
  <select name="command" aria-label="Commande">
    <option value="">Rechercher une commande</option>
    <option value="build">Build</option>
    <option value="test">Test</option>
  </select>
</div>
```

```ts
import { enhanceCombobox } from "@lilian1315/faisceau-ui";

const combobox = enhanceCombobox(document.querySelector<HTMLElement>("#command-combobox")!, {
  emptyLabel: "Aucun résultat",
});
```

Les valeurs d'option doivent être uniques. Les options `disabled` et les `<optgroup disabled>` sont reconnus. Un attribut `data-description` sur une option ajoute une seconde ligne à l'item généré. La valeur vide est réservée au placeholder et n'apparaît pas dans la liste.

## Thèmes et personnalisation

Le thème clair est appliqué par défaut. Le thème sombre s'active sur la page entière ou sur un sous-arbre :

```html
<html data-fui-theme="dark"></html>
```

Les couleurs, rayons, dimensions et durées sont exposés sous forme de variables `--fui-*` et peuvent être redéfinis localement :

```css
.my-form {
  --fui-color-ring: oklch(0.62 0.19 255);
  --fui-radius-md: 0.75rem;
}
```

Toutes les classes appartenant à la bibliothèque commencent par `fui-`. Les attributs d'état et d'accessibilité ajoutés par Zag restent disponibles pour des ajustements ciblés.

## Cycle de vie

Les quatre fonctions renvoient un contrôleur commun :

- `root` : élément racine du composant ;
- `api` : valeur réactive Faisceau contenant l'API Zag courante, accessible avec `controller.api.get()` ;
- `started` : indique si la machine a été démarrée ;
- `mount(target)` : ajoute un composant créé au DOM et le démarre ;
- `start()` : démarre un composant dont le DOM a été inséré manuellement ;
- `destroy()` : arrête les effets et écouteurs de façon idempotente.

`destroy()` retire le markup produit par une fonction `create*`. Pour une fonction `enhance*`, seuls les éléments générés sont retirés : le conteneur et son `<select>` original restent dans le document avec la sélection courante.

```ts
const select = createSelect({ label: "Mode", items: ["Simple", "Expert"] });

document.body.append(select.root);
select.start();

console.log(select.api.get().value);
select.destroy();
```

## Développement

Depuis la racine du monorepo :

```bash
# Installer et synchroniser le workspace Vite+
vp install

# Installer Chrome for Testing pour Vitest Browser (première utilisation)
vp exec playwright install chromium

# Formater, lint et vérifier les types
vp check

# Tester dans Chrome for Testing puis empaqueter toutes les bibliothèques
vp run -r test
vp run -r build

# Exécuter toute la validation
vp run ready

# Lancer le site de démonstration
vp run dev
```

Les scripts `build` des bibliothèques utilisent `vp pack`, la commande Vite+ destinée aux packages publiables.
