ko.bindingHandlers.sortable.options.receive = function(event, ui) {
    var el = ui.item[0],
        item = ko.utils.domData.get(el, "ko_dragItem"),
        draggable, targetParent, targetIndex;

    if (item) {
        targetParent = ko.utils.domData.get(this, "ko_sortList");
        draggable = $(this).children(".ui-draggable");
        targetIndex = draggable.index();

        if (targetIndex >= 0) {
            targetParent.splice(targetIndex, 0, new item());
            draggable.remove();
        }
    }
};
