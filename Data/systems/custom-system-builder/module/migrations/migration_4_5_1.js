/*
 * Copyright 2024 Jean-Baptiste Louvet-Daniel
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import Logger from '../Logger.js';
import { finishMigration, logProgress } from './migrationUtils.js';
import CustomActiveEffect from '../documents/activeEffect.js';
import CustomStatusEffectsApplication from '../applications/CustomStatusEffectsApplication.js';
async function processMigration() {
    const versionNumber = '4.5.1';
    const characters = [].concat(Array.from(game.scenes)
        .flatMap((scene) => Array.from(scene.tokens))
        .filter((token) => !token.actorLink && token.actor)
        .map((token) => token.actor), game.actors.filter((actor) => !actor.isTemplate));
    const templates = game.actors.filter((actor) => actor.isTemplate);
    const filteredCollection = characters.flatMap((entity) => Array.from(entity.items)).concat(Array.from(game.items));
    const hasItemModifiers = filteredCollection.some((item) => item.system.modifiers && item.system.modifiers.length > 0);
    const hasStatusEffectsModifiers = templates.some((template) => Object.values(template.system.statusEffects).flat().length > 0);
    if (game.settings.get(game.system.id, 'show451ConversionPopUp') &&
        (hasItemModifiers || hasStatusEffectsModifiers)) {
        Dialog.confirm({
            content: `${game.i18n.localize('CSB.Modifier.ConversionDialog.Text')}<input type="checkbox" id="CSB-4-5-1-do-not-show-again" /><label for="CSB-4-5-1-do-not-show-again">${game.i18n.localize('CSB.Modifier.ConversionDialog.Checkbox')}</label>`,
            defaultYes: false,
            rejectClose: true,
            yes: async (html) => {
                saveDoNotShowSetting(html);
                let modifierCount = 0;
                let activeEffectCount = 0;
                for (let i = 0; i < filteredCollection.length; i++) {
                    const item = filteredCollection[i];
                    const result = await convertItemModifiers(item);
                    modifierCount += result.modifierCount;
                    activeEffectCount += result.activeEffectCount;
                    logProgress(item, versionNumber, i, filteredCollection.length);
                }
                for (let i = 0; i < templates.length; i++) {
                    const template = templates[i];
                    const result = await convertStatusModifiers(template);
                    modifierCount += result.modifierCount;
                    activeEffectCount += result.activeEffectCount;
                    logProgress(template, versionNumber, i, filteredCollection.length);
                }
                Logger.info(`Converted ${modifierCount} modifiers in ${activeEffectCount} active effects across ${filteredCollection.length} items`);
                finishMigration();
                if (hasStatusEffectsModifiers) {
                    Dialog.prompt({
                        content: game.i18n.localize('CSB.Modifier.ConversionDialog.OpenStatusConfiguration'),
                        callback: () => {
                            //@ts-expect-error Outdated types
                            new CustomStatusEffectsApplication().render(true);
                        },
                        title: game.i18n.localize('CSB.Settings.CustomStatusEffects.Name'),
                        label: game.i18n.localize('CSB.Settings.CustomStatusEffects.Name')
                    });
                }
            },
            no: (html) => {
                saveDoNotShowSetting(html);
            },
            title: 'Convert Modifiers to ActiveEffects ?'
        });
    }
}
async function saveDoNotShowSetting(html) {
    const isChecked = html.find('#CSB-4-5-1-do-not-show-again').is(':checked');
    game.settings.set(game.system.id, 'show451ConversionPopUp', !isChecked);
}
async function convertItemModifiers(item) {
    const modifiers = item.system.modifiers ?? [];
    const newAEData = convertModifiersToActiveEffects(modifiers, item.parent?.system.activeConditionalModifierGroups ?? []);
    await item.createEmbeddedDocuments('ActiveEffect', newAEData);
    await item.update({
        system: {
            modifiers: []
        }
    });
    return {
        modifierCount: modifiers.length,
        activeEffectCount: newAEData.length
    };
}
async function convertStatusModifiers(template) {
    let modifierCount = 0;
    let activeEffectCount = 0;
    let newAEData = [];
    for (const statusKey in template.system.statusEffects) {
        const modifiers = template.system.statusEffects?.[statusKey] ?? [];
        newAEData = newAEData.concat(convertModifiersToActiveEffects(modifiers, undefined, `${statusKey} - ${template.name}`));
        modifierCount += modifiers.length;
        activeEffectCount += newAEData.length;
    }
    await CustomActiveEffect.getContainerItem().createEmbeddedDocuments('ActiveEffect', newAEData);
    await template.update({
        system: {
            statusEffects: Object.fromEntries(Object.entries(template.system.statusEffects).map(([key]) => {
                return [`-=${key}`, true];
            }))
        }
    });
    return {
        modifierCount,
        activeEffectCount
    };
}
function convertModifiersToActiveEffects(modifiers, activeModifierGroups, overrideName) {
    const modifiersByGroupName = {};
    const newAEData = [];
    modifiers.forEach((mod) => {
        const groupName = overrideName ?? mod.conditionalGroup ?? '';
        if (!modifiersByGroupName[groupName]) {
            modifiersByGroupName[groupName] = [];
        }
        modifiersByGroupName[groupName].push(mod);
    });
    Object.entries(modifiersByGroupName).forEach(([name, modifiers]) => {
        const changes = [];
        modifiers.forEach((mod) => {
            let mode = CONST.ACTIVE_EFFECT_MODES.ADD;
            let signOperator = null;
            switch (mod.operator) {
                case 'add':
                    mode = CONST.ACTIVE_EFFECT_MODES.ADD;
                    break;
                case 'multiply':
                    mode = CONST.ACTIVE_EFFECT_MODES.MULTIPLY;
                    break;
                case 'subtract':
                    mode = CONST.ACTIVE_EFFECT_MODES.ADD;
                    signOperator = '-';
                    break;
                case 'divide':
                    mode = CONST.ACTIVE_EFFECT_MODES.MULTIPLY;
                    signOperator = '1/';
                    break;
                case 'set':
                    mode = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
                    break;
            }
            changes.push({
                key: mod.key,
                value: signOperator ? `${signOperator}(${mod.formula})` : mod.formula,
                priority: mod.priority,
                mode
            });
        });
        newAEData.push({
            name: name === '' ? game.i18n.localize('CSB.Modifier.DefaultModifierGroupName') : name,
            transfer: true,
            type: 'base',
            img: 'icons/svg/aura.svg',
            changes,
            system: {
                tags: name === ''
                    ? [game.i18n.localize('CSB.Modifier.PassiveModifier')]
                    : [game.i18n.localize('CSB.Modifier.ActiveModifier')]
            },
            disabled: name !== '' && activeModifierGroups !== undefined ? !activeModifierGroups.includes(name) : false
        });
    });
    return newAEData;
}
export default {
    processMigration
};
