import { Settings } from './settings.js';

/**
 * A form for inputting Custom CSS settings.
 *
 * @export
 * @class SettingsForm
 * @extends {FormApplication}
 */
export class SettingsForm extends FormApplication {
    /**
     * Default Options for this FormApplication
     *
     * @readonly
     * @static
     * @memberof SettingsForm
     */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "customcss-settings-form",
            title: game.i18n.localize("CCSS.settings.settingsMenu.title"),
            template: "./modules/custom-css/templates/settings.html",
            classes: ["sheet"],
            width: 500,
            height: game.user.isGM ? 900 : 500,
            closeOnSubmit: false,
            submitOnClose: true,
            resizable: true
        });
    }

    codeEditors = [];

    /**
     * Construct an object of data to be passed to this froms HTML template.
     *
     * @return {object} The data being supplied to the template.
     * @memberof SettingsForm
     */
    getData() {
        return {
            isGM: game.user.isGM,
            stylesheet: Settings.getWorldStylesheet(),
            userStylesheet: Settings.getUserStylesheet() 
        };
    }

    /**
     * Handles retrieving data from the form.
     *
     * @override Save the code editor instance before retrieving data to ensure the data is synchronised. 
     *
     * @param {array} args - All arguments passed to this method, which will be forwarded to super
     * @return {object} The form data 
     * @memberof SettingsForm
     */
    _getSubmitData(...args) {
        this.codeEditors.forEach(editor => editor.save());
        return super._getSubmitData(...args);
    }

    /**
     * Executes on form submission.
     *
     * @param {Event} event - the form submission event
     * @param {object} data - the form data
     * @memberof SettingsForm
     */
    async _updateObject(event, data) {
        await Settings.updateStylesheets(data["stylesheet"], data["userStylesheet"]);
    }

    /**
     * Handles editor resizing.
     * 
     * @param {element} element - The drag handle element.
     * @param {string} direction - The direction of the drag handle.
     * @memberof SettingsForm
     */
    dragElement(element, direction) {
        var md;
        const first = document.getElementById("ccss-top");
        const second = document.getElementById("ccss-bottom");
        const splitter = document.getElementById("ccss-container");
    
        element.onmousedown = onMouseDown;
    
        function onMouseDown(e) {
            md = {
                e,
                offsetLeft: element.offsetLeft,
                offsetTop: element.offsetTop,
                offsetBottom: element.offsetBottom,
                firstWidth: first.offsetWidth,
                secondWidth: second.offsetWidth,
                firstHeight: first.offsetHeight,
                secondHeight: (splitter.offsetHeight - first.offsetHeight)
            };
            document.onmousemove = onMouseMove;
    
            document.onmouseup = () => {
                document.onmousemove = document.onmouseup = null;
            }
        }
    
        function onMouseMove(e) {
    
            var delta = {
                x: e.clientX - md.e.x,
                y: e.clientY - md.e.y
            };
    
            if (direction === "H") {
                delta.x = Math.min(Math.max(delta.x, -md.firstWidth),
                    md.secondWidth);
                element.style.left = md.offsetLeft + delta.x + "px";
                first.style.width = (md.firstWidth + delta.x) + "px";
                second.style.width = (md.secondWidth - delta.x) + "px";
            }
    
            if (direction === "V") {
                delta.y = Math.min(Math.max(delta.y, -md.firstHeight), md.secondHeight);
                element.style.top = md.offsetTop + delta.y + "px";
                first.style.height = (md.firstHeight + delta.y) + "px";
                second.style.height = (md.secondHeight - delta.y) + "px";
            }
        }
    }

    /**
     * Activates all event listeners related to this form.
     *
     * @override Activates the CodeMirror code editor.
     *
     * @param {JQuery} html - The html content of the form.
     * @memberof SettingsForm
     */
    activateListeners(html) {
        super.activateListeners(html);

        const options = { 
            mode: "css",
            ...CodeMirror.userSettings,
            lineNumbers: true,
            inputStyle: "contenteditable",
            autofocus: true,
            spellcheck: true,
            extraKeys: { "Ctrl-Space": "autocomplete" }
        }

        if (game.user.isGM) {
            this.codeEditors.push(CodeMirror.fromTextArea(html.find(".stylesheet")[0], options));
            this.dragElement(document.getElementById("ccss-sep"), "V");
        }

        this.codeEditors.push(CodeMirror.fromTextArea(html.find(".userStylesheet")[0], options));
    } 
}
