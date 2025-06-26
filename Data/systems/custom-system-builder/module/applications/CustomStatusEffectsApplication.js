// Similar syntax to importing, but note that
// this is object destructuring rather than an actual import
import CustomActiveEffect from '../documents/activeEffect.js';
import Logger from '../Logger.js';
//@ts-expect-error Outaded types
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class CustomStatusEffectsApplication extends HandlebarsApplicationMixin(ApplicationV2) {
    static initApp() {
        Object.values(CustomStatusEffectsApplication.PARTS).forEach((part) => {
            part.template = part.template.replace('{game.system.id}', game.system.id);
        });
    }
    static async saveHandler(_event, _form, formData) {
        const formDataObj = foundry.utils.expandObject(Object.fromEntries(formData.entries()));
        const effectArray = Object.values(formDataObj.effects ?? {});
        if (effectArray.some((statusEffect, index) => {
            const isSet = (value) => {
                return value !== undefined && value !== null && value !== '';
            };
            const isValid = isSet(statusEffect.id) && isSet(statusEffect.name) && isSet(statusEffect.img);
            if (!isValid) {
                Logger.error(`Status effect ${index} is invalid`, statusEffect);
            }
            return !isValid;
        })) {
            Logger.error(game.i18n.localize('CSB.Settings.CustomStatusEffects.StatusEffectInvalid'));
            ui.notifications.error(game.i18n.localize('CSB.Settings.CustomStatusEffects.StatusEffectInvalid'));
            return;
        }
        const finalSpecialEffects = {};
        //@ts-expect-error Outdated types
        for (const key of Object.keys(CONFIG.specialStatusEffects)) {
            if (!formDataObj.specialStatusEffect[key] ||
                !effectArray.some((effect) => effect.id === formDataObj.specialStatusEffect[key])) {
                const localizedName = game.i18n.has(`CSB.Settings.CustomStatusEffects.SpecialStatusEffects.${key}`, true)
                    ? game.i18n.localize(`CSB.Settings.CustomStatusEffects.SpecialStatusEffects.${key}`)
                    : key;
                Logger.error(game.i18n.format('CSB.Settings.CustomStatusEffects.SpecialStatusEffectInvalid', {
                    effect: localizedName
                }));
                ui.notifications.error(game.i18n.format('CSB.Settings.CustomStatusEffects.SpecialStatusEffectInvalid', {
                    effect: localizedName
                }));
                return;
            }
            finalSpecialEffects[key] = formDataObj.specialStatusEffect[key];
        }
        CONFIG.statusEffects = effectArray;
        game.settings.set(game.system.id, 'customStatusEffects', effectArray);
        //@ts-expect-error Outdated types
        CONFIG.specialStatusEffects = finalSpecialEffects;
        game.settings.set(game.system.id, 'customSpecialStatusEffects', finalSpecialEffects);
        //@ts-expect-error Outdated types
        this.close();
    }
    static async cancel(_event, _target) {
        //@ts-expect-error Outdated types
        this.close();
    }
    static async resetEffects(_event, _target) {
        Dialog.confirm({
            title: game.i18n.localize('CSB.Settings.CustomStatusEffects.ResetDialog.Title'),
            content: `<p>${game.i18n.localize('CSB.Settings.CustomStatusEffects.ResetDialog.Content')}</p>`,
            defaultYes: false,
            no: () => { },
            yes: async () => {
                await game.settings.set(game.system.id, 'customStatusEffects', null);
                await game.settings.set(game.system.id, 'customSpecialStatusEffects', null);
                window.location.reload();
            }
        });
    }
    static async addEffect(_event, target) {
        const windowContent = target.closest('.window-content');
        const newStatusEffectRow = windowContent.querySelector('.statusEffect-template').content.cloneNode(true);
        const currentIndex = parseInt(Array.from(windowContent.querySelectorAll('.statusEffect'))?.pop()?.dataset?.index ??
            '-1');
        const newIndex = currentIndex + 1;
        newStatusEffectRow.querySelector('.statusEffect').dataset.index = String(newIndex);
        newStatusEffectRow.querySelector('.custom-system-effect-id').name = `effects.${newIndex}.id`;
        newStatusEffectRow.querySelector('.custom-system-effect-name').name = `effects.${newIndex}.name`;
        newStatusEffectRow.querySelector('.custom-system-effect-img').name = `effects.${newIndex}.img`;
        windowContent?.querySelector('.statusEffectList')?.append(newStatusEffectRow);
    }
    static async removeEffect(_event, target) {
        const effectId = target
            .closest('.statusEffect')
            ?.querySelector('.custom-system-effect-id')?.value;
        if (effectId) {
            target
                .closest('.custom-system-customStatusEffects')
                ?.querySelector('.specialStatusEffects')
                ?.querySelectorAll('.custom-system-special-effect')
                .forEach((select) => {
                select.querySelector(`option[value="${effectId}"]`)?.remove();
            });
        }
        target.closest('.statusEffect')?.remove();
    }
    /**
     * Handle changing an status effect image.
     */
    static async editImage(_event, target) {
        const hiddenInput = target.querySelector('.custom-system-effect-img');
        const img = target.querySelector('img');
        const current = hiddenInput.value;
        const fp = new FilePicker({
            current,
            type: 'image',
            callback: (path) => {
                img.src = path;
                hiddenInput.value = path;
            }
        });
        return fp.browse(current);
    }
    /**
     * Handle changing an status effect image.
     */
    static async removeLinkedEffect(_event, target) {
        const parent = target.parentElement;
        const index = parseInt(parent.parentElement.dataset.index);
        const windowContent = target.closest('.window-content');
        const newLinkedEffectSelect = windowContent.querySelector('.statusEffect-linkedEffect-select-template').content.cloneNode(true);
        newLinkedEffectSelect.name = `effects.${index}.linkedEffect-select`;
        parent.innerHTML = '';
        parent.append(newLinkedEffectSelect);
    }
    /**
     * Handle changing an status effect image.
     */
    static async setLinkedEffect(_event, target) {
        const statusEffectRow = target.closest('.statusEffect');
        const index = statusEffectRow.dataset.index;
        const effectId = target.value;
        const activeEffect = CustomActiveEffect.getPredefinedEffect(effectId);
        if (activeEffect) {
            const windowContent = target.closest('.window-content');
            const newLinkedEffect = windowContent.querySelector('.statusEffect-linkedEffect-template').content.cloneNode(true);
            const linkedEffectInput = newLinkedEffect.querySelector('.custom-system-effect-linkedEffectId');
            const linkedEffectLink = newLinkedEffect.querySelector('.content-link');
            const linkedEffectImage = linkedEffectLink.querySelector('img');
            linkedEffectInput.value = effectId;
            linkedEffectInput.name = `effects.${index}.linkedEffectId`;
            linkedEffectLink.dataset.id = effectId;
            linkedEffectLink.dataset.uuid = activeEffect.uuid;
            linkedEffectLink.dataset.tooltip = activeEffect.name;
            linkedEffectLink.append(activeEffect.name);
            linkedEffectImage.src = activeEffect.img;
            linkedEffectImage.alt = `activeEffect.name image`;
            target.after(newLinkedEffect);
            target.remove();
        }
    }
    /**
     * Handle changing a status ID.
     */
    static async updateStatusId(_event, target) {
        const newEffectId = target.value;
        const oldEffectId = target.dataset.previousValue;
        target
            .closest('.custom-system-customStatusEffects')
            ?.querySelector('.specialStatusEffects')
            ?.querySelectorAll('.custom-system-special-effect')
            .forEach((select) => {
            if (oldEffectId) {
                const option = select.querySelector(`option[value="${oldEffectId}"]`);
                if (newEffectId) {
                    if (option) {
                        option.value = newEffectId;
                        option.innerHTML = newEffectId;
                    }
                }
                else {
                    if (option) {
                        option.remove();
                    }
                }
            }
            else {
                if (newEffectId) {
                    const newOption = document.createElement('option');
                    newOption.value = newEffectId;
                    newOption.innerHTML = newEffectId;
                    select.append(newOption);
                }
            }
        });
        target.dataset.previousValue = newEffectId;
    }
    /**
     * Handle opening ActiveEffect sheet on click.
     */
    static async openEffect(_event, target) {
        const uuid = target.dataset.uuid;
        if (uuid) {
            fromUuidSync(uuid).sheet?.render(true);
        }
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.statusEffects = CONFIG.statusEffects.map((effect) => {
            const newEffect = { ...effect };
            if (newEffect.name.startsWith('EFFECT.')) {
                newEffect.name = game.i18n.localize(newEffect.name);
            }
            if (newEffect.linkedEffectId) {
                newEffect.linkedEffect = CustomActiveEffect.getPredefinedEffect(newEffect.linkedEffectId);
            }
            return newEffect;
        });
        //@ts-expect-error Outdated types
        context.specialStatusEffects = Object.entries(CONFIG.specialStatusEffects)
            .map(([name, statusEffectId]) => {
            return {
                name,
                localizedName: game.i18n.has(`CSB.Settings.CustomStatusEffects.SpecialStatusEffects.${name}`, true)
                    ? game.i18n.localize(`CSB.Settings.CustomStatusEffects.SpecialStatusEffects.${name}`)
                    : name,
                statusEffectId
            };
        })
            .sort((a, b) => a.name.localeCompare(b.name));
        context.buttons = [
            { type: 'submit', icon: 'fa-solid fa-save', label: 'Save' },
            { type: 'button', action: 'cancel', icon: 'fa-solid fa-xmark', label: 'Cancel' },
            { type: 'button', action: 'resetEffects', icon: 'fa-solid fa-undo', label: 'Reset' }
        ];
        context.PREDEFINED_EFFECTS = [{ id: '', name: '' }, ...CustomActiveEffect.getPredefinedEffectsData()];
        console.log(context);
        return context;
    }
    /**
     * Actions performed after any render of the Application.
     * Post-render steps are not awaited by the render process.
     */
    _onRender(context, options) {
        super._onRender(context, options);
        //@ts-expect-error Outdated types
        const statusEffectList = this.element.querySelector('.statusEffectList');
        statusEffectList.addEventListener('change', (event) => {
            const targetElement = event.target;
            if (targetElement.classList.contains('custom-system-effect-linkedEffect-select')) {
                const selectElement = targetElement;
                CustomStatusEffectsApplication.setLinkedEffect.call(this, event, selectElement);
            }
        });
        statusEffectList.addEventListener('change', (event) => {
            const targetElement = event.target;
            if (targetElement.classList.contains('custom-system-effect-id')) {
                const inputElement = targetElement;
                CustomStatusEffectsApplication.updateStatusId.call(this, event, inputElement);
            }
        });
    }
}
CustomStatusEffectsApplication.DEFAULT_OPTIONS = {
    tag: 'form',
    form: {
        handler: CustomStatusEffectsApplication.saveHandler,
        submitOnChange: false,
        closeOnSubmit: false
    },
    actions: {
        cancel: CustomStatusEffectsApplication.cancel,
        addEffect: CustomStatusEffectsApplication.addEffect,
        removeEffect: CustomStatusEffectsApplication.removeEffect,
        editImage: CustomStatusEffectsApplication.editImage,
        removeLinkedEffect: CustomStatusEffectsApplication.removeLinkedEffect,
        openEffect: CustomStatusEffectsApplication.openEffect,
        resetEffects: CustomStatusEffectsApplication.resetEffects
    },
    window: {
        title: 'CSB.Settings.CustomStatusEffects.Name',
        icon: 'fas fa-fire',
        resizable: true,
        minimizable: true,
        contentClasses: ['standard-form']
    },
    position: {
        width: 700,
        height: 'auto'
    },
    classes: ['custom-system-customStatusEffects']
};
CustomStatusEffectsApplication.PARTS = {
    form: {
        template: 'systems/{game.system.id}/templates/settings/configureStatusEffects.hbs'
    },
    footer: {
        template: 'templates/generic/form-footer.hbs'
    }
};
export default CustomStatusEffectsApplication;
