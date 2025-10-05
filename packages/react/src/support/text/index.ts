/** Text component for the support widget.
 *
 * The text logic of the support widget should be powerful yet simple to use.
 * We should be able to have a central place with acceptable text keys.
 * For instance "page.home.welcomeText"
 *
 * Each key can have a default text (coming from the default text setting) and multiple locales.
 *
 * Default locale is always "en" (english)
 *
 * We want to expose a way to the end user of the widget, to OVERRIDE the locales.
 *
 * By default they should be able to pass a locale config object with either:
 *
 * const config = {
 *   "page.home.welcomeText": "their new text"
 * }
 *
 * OR
 *
 *  const config = {
 *   "page.home.welcomeText": {
 *      "en": "their en new text",
 *      "fr": "their fr new text"
 *    }
 * }
 *
 * We also want them to have access to params and context
 *
 * const config: CossistantWidgetText = {
 *   "page.home.welcomeText": ({ visitor, humanAgents, aiAgents, utils }) => `Hello ${visitor.contact.name}`
 * }
 *
 *
 * Everything should be typed, from the keys, to the params and context.
 *
 * The users cannot add new keys, but they can add locales
 *
 * By default, we should use the widget default props locale, then the visitor's browser locale
 *
 * If there is no keys for this locale, we default ALWAYS to the english and cossistant default locales
 *
 * The developer should be able to change only one key and keep all the other ones.
 */
