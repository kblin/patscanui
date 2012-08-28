ko.bindingHandlers.drag = {
    init: function(element, valueAccessor, allBindingsAccessor) {

        //set meta-data
        ko.utils.domData.set(element, "ko_dragItem", valueAccessor());

        //combine options passed into binding (in dragOptions binding) with global options (in ko.bindingHandlers.drag.options)
        var options = ko.utils.extend(ko.bindingHandlers.drag.options, allBindingsAccessor().dragOptions);

        //initialize draggable
        $(element).draggable(options);
    },
    options: {
        connectToSortable: "." + ko.bindingHandlers.sortable.connectClass,
        helper: "clone"
    }
};
