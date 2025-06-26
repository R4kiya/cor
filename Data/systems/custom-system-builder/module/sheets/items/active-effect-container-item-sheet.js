export default class ActiveEffectContainerItemSheet extends ItemSheet {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['custom-system', 'sheet', 'item'],
            template: 'systems/' + game.system.id + '/templates/item/item-sheet.hbs',
            width: 600,
            height: 600,
            tabs: [
                {
                    navSelector: '.sheet-tabs',
                    contentSelector: '.sheet-body'
                }
            ],
            scrollY: ['.custom-system-actor-content'],
            dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }]
        });
    }
    /**
     * @override
     * @ignore
     */
    get template() {
        return `systems/${game.system.id}/templates/item/${this.item.type}-sheet.hbs`;
    }
    /** @override */
    async getData() {
        // Retrieve the data structure from the base sheet. You can inspect or log
        // the context variable to see the structure, but some key properties for
        // sheets are the actor object, the data object, whether or not it's
        // editable, the items array, and the effects array.
        const baseContext = super.getData();
        const context = await baseContext.item.templateSystem.getSheetData(baseContext);
        return context;
    }
    /**
     * Render the inner application content
     * @param {object} data         The data used to render the inner template
     * @returns {Promise<jQuery>}   A promise resolving to the constructed jQuery object
     * @private
     * @override
     * @ignore
     */
    async _renderInner(data) {
        const html = await super._renderInner(data);
        // Append built sheet to html
        html.find('.custom-system-customBody').append(data.bodyPanel);
        return html;
    }
}
