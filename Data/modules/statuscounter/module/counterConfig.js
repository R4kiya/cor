import { getCounterTypes } from "./counterTypes.js";
import { DurationType } from "./durationType.js";
import { getEffectId } from "./effectUtils.js";

/**
 * Form application that implements counter configuration options.
 */
export default class CounterConfig extends FormApplication {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "modules/statuscounter/templates/counterConfig.hbs",
            width: 420,
        });
    }

    /**
     * @returns {string} A unique id for the effect's counter configuration.
     * @override
     */
    get id() {
        return `counter-config-${this.object.id}`;
    }

    /**
     * @returns {string} The title of the configuration dialog.
     * @override
     */
    get title() {
        return `${this.object.name}: ${game.i18n.localize("statuscounter.config.title")}`;
    }

    /**
     * Prepares the display data of the dialog.
     * @returns {object} The data required for rendering the dialog.
     * @override
     */
    getData() {
        const types = Object.entries(getCounterTypes()).reduce((types, [type, cls]) => {
            if (cls.allowType(this.object)) types[type] = cls.label;
            return types;
        }, {});

        const counterData = this.object._source.flags.statuscounter ?? { config: {} };
        counterData.config.dataSource ??= "flags.statuscounter.value";

        return {
            name: this.object.name,
            data: counterData,
            value: this.object.statusCounter._sourceValue ?? 1,
            durationTypes: Object.entries(DurationType).reduce((durationTypes, [key, value]) => {
                durationTypes[value] = game.i18n.localize(`statuscounter.config.durationType.${key.toLowerCase()}`);
                return durationTypes;
            }, {}),
            types,
            showTypes: Object.keys(types).length > 1,
        };
    }

    /**
     * Registers event listeners for this application.
     * @param {jQuery.Element} html The rendered JQuery element of the application.
     * @override
     */
    activateListeners(html) {
        super.activateListeners(html);
        html[0].querySelector("button.save-default")?.addEventListener("click", this._updateDefaults.bind(this));
    }

    /**
     * Updates the associated effect with the form data settings.
     * @returns {Promise.<void>} A promise representing the update operation.
     * @override
     */
    _updateObject(_event, formData) {
        const dataSource = this.object._source.flags.statuscounter.config.dataSource ?? "flags.statuscounter.value";
        const value = formData[dataSource] ?? 0;
        const visible = value > 1 || game.settings.get("statuscounter", "displayOne") === "always";
        formData["flags.statuscounter.visible"] = visible;
        return this.object.update(formData);
    }

    /**
     * Updates the default configuration for the associated effect with the form data settings.
     * @returns {Promise} A promise representing the settings update.
     */
    async _updateDefaults() {
        const id = getEffectId(this.object);
        if (!id) return;

        const data = foundry.utils.expandObject(this._getSubmitData()).flags.statuscounter.config;
        const defaults = game.settings.get("statuscounter", "counterDefaults");
        defaults[id] = data;
        await game.settings.set("statuscounter", "counterDefaults", defaults);
        return this.submit();
    }
}
