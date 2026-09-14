# Faisceau UI

Faisceau UI est une bibliothèque de composants DOM accessibles pour navigateurs modernes. Elle associe les machines d'état de [Zag.js](https://zagjs.com/) à [`@lilian1315/create-element`](https://github.com/lilian1315/create-element) et [`faisceau`](https://github.com/lilian1315/faisceau), sans dépendre d'un framework. Son apparence s'inspire de shadcn/ui, avec du CSS vanilla, les icônes open source de [Lucide](https://lucide.dev/) et des classes internes préfixées par `fui-`.

La bibliothèque fournit actuellement Select, Combobox, Checkbox, Tooltip, Dialog, Drawer et
Toast. Chaque composant peut construire son propre DOM ou adopter un markup HTML déjà présent.

## Architecture

Le monorepo contient deux bibliothèques destinées à être publiées sous un nom non scopé sur npm et
sous le scope `@lilian1315` sur JSR :

- `faisceau-zag` sur npm, `@lilian1315/faisceau-zag` sur JSR : pont générique entre une machine
  Zag, les valeurs réactives Faisceau et des éléments DOM. Il gère le cycle de vie, les mises à
  jour et l'application réactive des props Zag.
- `faisceau-ui` sur npm, `@lilian1315/faisceau-ui` sur JSR : composants, markup et styles. Il
  utilise le pont précédent et une machine Zag dédiée pour chaque composant lorsqu'elle existe.

Le package privé `published-smoke` importe les sorties construites par leurs points d'entrée publics,
vérifie leurs types et exécute une interaction réelle dans Chrome.

## Installation

```bash
pnpm add faisceau-ui
```

Importer une fois la feuille de styles globale depuis le point d'entrée de l'application :

```ts
import "faisceau-ui/styles/index.css";
```

Chaque composant est également disponible depuis son sous-chemin, par exemple
`faisceau-ui/select`, `faisceau-ui/dialog` ou
`faisceau-ui/toast`.

Pour utiliser directement le pont de bas niveau :

```bash
pnpm add faisceau-zag @zag-js/vanilla faisceau
```

Après publication, les mêmes bibliothèques pourront être ajoutées depuis JSR avec Deno :

```bash
deno add jsr:@lilian1315/faisceau-ui
deno add jsr:@lilian1315/faisceau-zag
deno add npm:faisceau-ui
```

JSR distribue les modules TypeScript, mais n'accepte pas une feuille CSS comme point d'entrée. Dans
une application Deno qui utilise un bundler prenant en charge le CSS, importez donc l'API depuis JSR
et la feuille de styles depuis le package npm :

```ts
import { createSelect } from "@lilian1315/faisceau-ui";
import "faisceau-ui/styles/index.css";
```

Le pont suit l'adapter Vanilla officiel et déclare ses runtimes en peer dependencies. Cette
version utilise Zag `2.0.0-next.3` et Faisceau 0.3.x. Le projet cible uniquement les navigateurs
modernes ; le rendu serveur ne fait pas partie de son contrat.

## Créer un Select

`createSelect` construit le markup avec `@lilian1315/create-element`. Le contrôleur reste arrêté jusqu'à son montage :

```ts
import { createSelect } from "faisceau-ui";
import "faisceau-ui/styles/index.css";

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
import { createCombobox } from "faisceau-ui";

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

Les fonctions `enhanceSelect`, `enhanceCombobox` et `enhanceCheckbox` adoptent un `Field` entièrement
structuré. Les classes `fui-*` constituent le contrat d'anatomie et doivent être présentes avant
l'appel. Le contrôle natif reste dans le document et conserve la soumission, la validation et le
reset du formulaire.

### Select existant

```html
<form id="settings">
  <div class="fui-field" id="mode-select">
    <label class="fui-field-label">Mode d'affichage</label>
    <div class="fui-select">
      <select class="fui-native-select" name="display-mode" required>
        <option value="" data-placeholder>Choisir un mode</option>
        <option value="simple" selected>Simple</option>
        <option value="expert" data-description="Affiche tous les réglages">Expert</option>
      </select>
      <div class="fui-select-control">…</div>
      <div class="fui-select-positioner">…</div>
    </div>
  </div>
</form>
```

```ts
import { enhanceSelect } from "faisceau-ui";

const select = enhanceSelect(document.querySelector<HTMLElement>("#mode-select")!);
```

La valeur initiale vient de l'option `selected`. Le placeholder vient de l'unique option
`value=""` portant `data-placeholder`. Une option `value=""` sans ce marqueur reste un item
sélectionnable normal.

### Combobox existante

```html
<div class="fui-field" id="command-combobox">
  <label class="fui-field-label">Commande</label>
  <div class="fui-combobox">
    <select class="fui-native-select" name="command">
      <option value="" data-placeholder>Rechercher une commande</option>
      <option value="build">Build</option>
      <option value="test">Test</option>
    </select>
    <div class="fui-combobox-control">…</div>
    <div class="fui-combobox-positioner">…</div>
  </div>
</div>
```

```ts
import { enhanceCombobox } from "faisceau-ui";

const combobox = enhanceCombobox(document.querySelector<HTMLElement>("#command-combobox")!, {
  emptyLabel: "Aucun résultat",
});
```

Les valeurs des options représentant des items doivent être uniques. Les items visuels doivent porter les mêmes `data-value`
que les options natives. Les options `disabled` et les `<optgroup disabled>` sont reconnues ; la
seule l'option vide portant `data-placeholder` est réservée au placeholder.

## Checkbox

`createCheckbox` construit un contrôle relié à un véritable `input[type="checkbox"]`, compatible avec `FormData`, `required` et le reset natif :

```ts
import { createCheckbox } from "faisceau-ui";

createCheckbox({
  label: "Accepter les conditions",
  name: "terms",
  required: true,
  value: "accepted",
}).mount(document.querySelector("#terms")!);
```

Pour l'enhancement, le `Field` et le contrôle visuel sont déjà présents :

```html
<div class="fui-field" id="newsletter">
  <label class="fui-field-label">Recevoir la newsletter</label>
  <div class="fui-checkbox">
    <input class="fui-native-checkbox" type="checkbox" name="newsletter" />
    <span class="fui-checkbox-control"><span class="fui-checkbox-indicator"></span></span>
  </div>
</div>
```

```ts
import { enhanceCheckbox } from "faisceau-ui";

enhanceCheckbox(document.querySelector<HTMLElement>("#newsletter")!);
```

## Tooltip

`createTooltip` génère un bouton et son infobulle accessible. `enhanceTooltip` peut utiliser le `title` d'un trigger existant ; l'attribut est temporairement retiré pour éviter la double infobulle puis restauré par `destroy()`.

```ts
import { createTooltip, enhanceTooltip } from "faisceau-ui";

createTooltip({ content: "Créer un document", trigger: "Créer" }).mount(document.body);
enhanceTooltip(document.querySelector<HTMLElement>("[title]")!);
```

## Dialog, Drawer et Toast

Dialog et Drawer acceptent le même modèle : la variante `create*` construit tout le composant,
tandis que `enhance*` part d'un trigger et d'un contenu existants marqués avec
`data-fui-part="trigger"` et `data-fui-part="content"`. Drawer utilise sa machine Zag dédiée :
il expose directement `swipeDirection`, les snap points, le grabber et une zone de swipe optionnelle.

```ts
import { createDialog, createDrawer, createToaster } from "faisceau-ui";

createDialog({ trigger: "Ouvrir", title: "Profil", content: "Contenu" }).mount(document.body);
createDrawer({
  trigger: "Filtres",
  title: "Filtres",
  content: "Contenu",
  swipeDirection: "end",
  snapPoints: [0.5, 1],
  swipeArea: true,
}).mount(document.body);

const toaster = createToaster({ placement: "bottom-end" }).mount(document.body);
toaster.store.success({ title: "Enregistré", description: "Les changements sont conservés." });
```

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

Les composants pilotés par une machine unique renvoient un contrôleur commun :

- `root` : élément racine du composant ;
- `api` : valeur réactive Faisceau en lecture seule contenant l'API Zag courante, accessible avec `controller.api.get()` ;
- `started` : indique si la machine a été démarrée ;
- `mount(target)` : ajoute un composant créé au DOM et le démarre ;
- `start()` : démarre un composant dont le DOM a été inséré manuellement ;
- `destroy()` : arrête les effets et écouteurs de façon idempotente.

`destroy()` retire le markup produit par une fonction `create*`. Pour une fonction `enhance*`, seuls les éléments générés sont retirés et le markup natif est restauré.

Le contrôleur Toast suit le même cycle de vie, mais expose `store` à la place de `api` afin de
créer, mettre à jour et fermer plusieurs notifications.

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

# Exécuter toute la validation, y compris les imports publics construits dans Chrome
vp run ready

# Lancer le site de démonstration
vp run dev
```

Les scripts `build` des bibliothèques utilisent `vp pack`, la commande Vite+ destinée aux packages
publiables. Chaque build vérifie le manifeste npm avec Publint et la correspondance entre les exports
npm et JSR. Le workflow de publication accepte les tags `faisceau-ui@<version>` et
`faisceau-zag@<version>` après avoir vérifié que `package.json`, `jsr.json` et le tag déclarent la
même version.
