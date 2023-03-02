import generateStyle from "./generateStyle.js";
import registerError from "./registerError.js";
import registerInfo from "./registerInfo.js";
import registerWarning from "./registerWarning.js";
import registerSuccess from "./registerSuccess.js";
import registerContentArea from "./registerContentArea.js";
import registerFileInput from "./registerFileInput.js";
import registerHover from "./registerHover.js";
!async function({toolRegister, genHexStr, loadCSSAsync, loadScriptAsync}){
    generateStyle(Modal.className);
    toolRegister.set("table-viewer", function(button){
        const mod = Modal({sty:[["background", "var(--bg-color-less-transparent)"]]});
        registerError(mod);
        registerInfo(mod);
        registerWarning(mod);
        registerSuccess(mod);
        const {rndID: cntRID, node: cntNode} = registerContentArea(mod);
        registerFileInput(mod, cntNode);
    });
}(taskq._exportPersist)