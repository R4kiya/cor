/**
 * Form application that allows removing defaults for specific statuses.
 */
export default class DefaultCounterConfig extends FormApplication {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "modules/statuscounter/templates/defaultCounterConfig.hbs",
            width: 420,
        });
    }

    /**
     * @returns {string} A unique id for the effect's counter configuration.
     * @override
     */
    get id() {
        return `default-counter-config`;
    }

    /**
     * @returns {string} The title of the configuration dialog.
     * @override
     */
    get title() {
        return game.i18n.localize("statuscounter.counterDefaults.name");
    }

    /**
     * Prepares the display data of the dialog.
     * @returns {object} The data required for rendering the dialog.
     * @override
     */
    getData() {
        const defaults = game.settings.get("statuscounter", "counterDefaults");
        return {
            statuses: Object.keys(defaults).map(statusId => {
                const status = CONFIG.statusEffects.find(effect => effect.id === statusId);
                const label = status ? game.i18n.localize(status.name) : statusId;
                return {
                    statusId,
                    label,
                }
            }),
        };
    }

    /**
     * Updates the associated effect with the form data settings.
     * @returns {Promise.<void>} A promise representing the update operation.
     * @override
     */
    _updateObject(_event, formData) {
        const defaults = game.settings.get("statuscounter", "counterDefaults");
        for (const [statusId, remove] of Object.entries(formData)) {
            if (remove) delete defaults[statusId];
        }

        return game.settings.set("statuscounter", "counterDefaults", defaults);
    }
}
