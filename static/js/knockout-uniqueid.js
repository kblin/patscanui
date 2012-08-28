ko.bindingHandlers.uniqueId = {
    init: function(element, valueAccessor) {
        var value = valueAccessor();
        value.id = value.id || ko.bindingHandlers.uniqueId.prefix + (++ko.bindingHandlers.uniqueId.counter);

        element.id = value.id;
    },
    counter: 0,
    prefix: "unique"
};

ko.bindingHandlers.uniqueFor = {
    init: function(element, valueAccessor) {
        var value = valueAccessor();
        value.id = value.id || ko.bindingHandlers.uniqueId.prefix + (++ko.bindingHandlers.uniqueId.counter);

        element.setAttribute("for", value.id);
    }
};
