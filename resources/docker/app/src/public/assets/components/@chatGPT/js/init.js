!async function({toolRegister}){
    toolRegister.set("ai-asist", function(button){
        Swal.fire("Coming Soon!");
    })
}(taskq._exportPersist)