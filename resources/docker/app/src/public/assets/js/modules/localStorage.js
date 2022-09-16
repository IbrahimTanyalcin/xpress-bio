!function(){
	function LocalStorage (addOn){	
		function checkLocalStorage(){
			if (localStorage && localStorage.available === "true"){
				return true;
			}
			try {
				var	x = '__storage_test__';
				localStorage.setItem(x, x);
				localStorage.removeItem(x);
				return (localStorage.available = true);
			}
			catch(e) {
				return e instanceof DOMException && (
					// everything except Firefox
					e.code === 22 ||
					// Firefox
					e.code === 1014 ||
					// test name field too, because code might not be present
					// everything except Firefox
					e.name === 'QuotaExceededError' ||
					// Firefox
					e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
					// acknowledge QuotaExceededError only if there's something already stored
					localStorage.length !== 0;
			}
		}
		function getTotalSize() {
			var total = 0,
				tempKey;
			if(!checkLocalStorage()){
				return 0;
			}
			for (tempKey in localStorage) {
				if(!localStorage.hasOwnProperty(tempKey)){
					continue;
				}
				total += (tempKey.length + localStorage[tempKey].length) * 2;
			}
			return Math.round(total/1024 * 1000)/1000;
		}
		function getRemainingSpace(){
			if(!checkLocalStorage()) {
				return 0;
			}
			//its 5120 but leave some space
			return 5000 - getTotalSize();
		}
		function setProtein(id,data){
			if(!checkLocalStorage()) {
				return false;
			}
			id = ""+id;
			typeof data !== "string" 
			? data = JSON.stringify(data)
			: void(0);
			var sizeKB = data.length * 2 / 1024;
			if (sizeKB > 5000) {
				console.log("object larger than max-storage available.");
				return false;
			}
			while(getRemainingSpace() < sizeKB) {
				freeUpStorage();
			}
			localStorage.proteins
			? (new RegExp(id,"gi")).test(localStorage.proteins)
				? void(0)
				: localStorage.proteins += id + ";"
			: localStorage.proteins = id + ";";
			localStorage[id] = data;
			return true;
		}
		function freeUpStorage(){
			var split = localStorage.proteins.split(";").filter(function(d,i){return d}),
				id = split.shift();
			localStorage.proteins = split.join(";")+";";
			id ? localStorage.removeItem(id) : void(0);
		}
		function removeProtein(id){
			localStorage.proteins = localStorage.proteins
				.split(";")
				.filter(function(d,i){return d && d !== id})
				.join(";")+";";
			localStorage[id] && localStorage.removeItem(id);
		}
		function captureData(node) {
			var nonEssential = ["variants","temp","OMIM_match","OMIM_noMatch","OMIM_notSNV","OMIM_original"],
				temp = node._data,
				data = {
					_data: Object.keys(temp).reduce(function(ac,d,i,a){if(!~nonEssential.indexOf(d)){ac[d] = temp[d];} return ac;},{}),
					_dataView: node._dataView
				};
			return JSON.stringify(data);
		}
		
		_storage = {
			checkLocalStorage:checkLocalStorage,
			getTotalSize:getTotalSize,
			getRemainingSpace:getRemainingSpace,
			setProtein:setProtein,
			freeUpStorage:freeUpStorage,
			removeProtein:removeProtein,
			captureData:captureData
		};
		taskq
		.export(_storage,"_storage");
	}
	LocalStorage._taskqId = "LocalStorage";
	LocalStorage._taskqWaitFor = ["reusableFunctions"];
	taskq.push(LocalStorage);
}();