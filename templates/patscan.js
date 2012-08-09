
function StringPattern(self) {
    this.getPattern = function() {
        if (!self.sequence()) {
            return "";
        }
        return self.sequence() + self.getMutationPattern();
    }

    this.getTemplate = function() {
        return "string-pattern-template";
    }
}

function NewStringPattern(viewmodel, sequence, mutations, insertions, deletions) {
    var p = new PatternElement('string', viewmodel);
    p.sequence(sequence);
    p.mutations(mutations);
    p.insertions(insertions);
    p.deletions(deletions);
    return p;
}

function RangePattern(self) {
    this.getPattern = function() {
        var from = parseInt(self.from());
        var to = parseInt(self.to());

        if (isNaN(from) || isNaN(to)) {
            return "";
        }

        return from + "..." + to;
    }

    this.getTemplate = function() {
        return "range-pattern-template";
    }
}

function NewRangePattern(viewmodel, from, to) {
    var p = new PatternElement('range', viewmodel);
    p.from(from);
    p.to(to);
    return p;
}

function ComplementPattern(self) {
    this.getPattern = function() {
        if (!self.reference()) {
            return "";
        }

        return "~" + self.reference().getName() + self.getMutationPattern();
    }

    this.getTemplate = function() {
        return "complement-pattern-template";
    }
}

function NewComplementPattern(viewmodel, reference, mutations, insertions, deletions) {
    var p = new PatternElement('complement', viewmodel);
    p.reference(reference);
    p.mutations(mutations);
    p.insertions(insertions);
    p.deletions(deletions);
    return p;
}

function RepeatPattern(self) {
    this.getPattern = function() {
        if (!self.reference()) {
            return "";
        }

        return self.reference().getName() + self.getMutationPattern();
    }

    this.getTemplate = function() {
        return "repeat-pattern-template";
    }
}

function NewRepeatPattern(viewmodel, reference, mutations, insertions, deletions) {
    var p = new PatternElement('repeat', viewmodel);
    p.reference(reference);
    p.mutations(mutations);
    p.insertions(insertions);
    p.deletions(deletions);
    return p;
}


function NotAnyPattern(self) {

    this.getPattern = function() {
        return "not implemented(notany)";
    }


    this.getTemplate = function() {
        return "notimplemented-pattern-template";
    }
}

function AnyPattern(self) {

    this.getPattern = function() {
        return "not implemented(any)";
    }


    this.getTemplate = function() {
        return "notimplemented-pattern-template";
    }
}

function WeightPattern(self) {

    this.getPattern = function() {
        return "not implemented(weight)";
    }


    this.getTemplate = function() {
        return "notimplemented-pattern-template";
    }
}

function LengthPattern(self) {

    this.getPattern = function(idx) {
        return " not implemented(length)";
    }


    this.getTemplate = function() {
        return "notimplemented-pattern-template";
    }
}


function PatternElement(type, viewmodel) {
    var self = this;
    self.type = ko.observable(type);
    self.viewmodel = viewmodel;
    self.vtable = {
        'string': new StringPattern(self),
        'range': new RangePattern(self),
        'complement': new ComplementPattern(self),
        'repeat': new RepeatPattern(self),
        'anyof' : new AnyPattern(self),
        'notany': new NotAnyPattern(self),
        'weigth': new WeightPattern(self),
        'length': new LengthPattern(self),
    };

    self.available_types = ko.computed(function() {
        var available = [];
        for (t in self.vtable) {
            available.push(t);
        }
        return available;
    }, self);

    self.sequence = ko.observable();
    self.reference = ko.observable();
    self.mutations = ko.observable();
    self.insertions = ko.observable();
    self.deletions = ko.observable();

    self.from = ko.observable();
    self.to = ko.observable();

    self.named = ko.observable(false);

    self.getMutationPattern = function() {
        var mutations = parseInt(self.mutations()) || 0;
        var insertions = parseInt(self.insertions()) || 0;
        var deletions = parseInt(self.deletions()) || 0;

        if (Math.max(mutations, insertions, deletions) > 0) {
            return "[" + mutations + "," + insertions + "," + deletions +"]";
        }
        return "";
    };

    self.getName = function() {
        var idx = self.viewmodel.pattern_elements.indexOf(self);
        return "p" + (idx + 1);
    };

    self.getPattern = ko.computed(function() {
        var prefix = self.named() ? self.getName() + "=" : "";
        var pattern = self.vtable[self.type()].getPattern();
        if (!pattern) {
            return "";
        }
        return " "  + prefix + pattern;
    }, self);

    self.getTemplate = function() {
        return self.vtable[self.type()].getTemplate();
    };
}


function AppViewModel() {
    var self = this;

    self.pattern_elements = ko.observableArray([new PatternElement('string', self)]);

    self.help_visible = ko.observable(false);
    self.help_description = ko.observable("Show help");

    self.pattern_visible = ko.observable(true);
    self.pattern_description = ko.observable("Hide pattern");

    self.results = ko.observable("Results go here");
    self.results_visible = ko.observable(true);
    self.result_cols = ko.observable(20);
    self.result_rows = ko.observable(2);

    self.toggleHelp = function() {
        if (self.help_visible()) {
            self.help_visible(false);
            self.help_description("Show help");
            return;
        }
        self.help_visible(true);
        self.help_description("Hide help");
    };

    self.togglePattern = function() {
        if (self.pattern_visible()) {
            self.pattern_visible(false);
            self.pattern_description("Show pattern");
            return;
        }
        self.pattern_visible(true);
        self.pattern_description("Hide pattern");
    };

    self.showExamplePattern = function() {

        self.clearPattern();

        self.pattern_elements.push(NewStringPattern(self, "TATATAT"));
        self.pattern_elements()[0].named(true);
        self.pattern_elements.push(NewRangePattern(self, 3, 5));
        self.pattern_elements()[1].named(true);
        self.pattern_elements.push(NewRepeatPattern(self, self.pattern_elements()[0], 0, 2));
        self.pattern_elements.push(NewRangePattern(self, 9, 17));
        self.pattern_elements.push(NewComplementPattern(self, self.pattern_elements()[1], 2, 0, 3));

        if (!self.pattern_visible()) {
            self.togglePattern();
        }
    };

    self.clearPattern = function() {
        self.pattern_elements.removeAll();
    }

    self.availableElements = ko.computed(function() {
        var available = [];
        for (i=0; i< self.pattern_elements().length; i++) {
            el = self.pattern_elements()[i];
            if (el.named()) {
                available.push(el);
            }
        }
        return available;
    }, self);

    self.pattern = ko.computed(function() {
        var pattern_string = "";
        for (i=0; i < self.pattern_elements().length; i++) {
            el = self.pattern_elements()[i];
            pattern_string += el.getPattern();
        }
        return pattern_string.substring(1);
    }, self);

    self.addElement = function() {
        self.pattern_elements.push(new PatternElement('string', self));
    };

    self.removeElement = function(element) {
        self.pattern_elements.remove(element);
    };

    self.addBefore = function(element) {
        self.pattern_elements.splice(self.pattern_elements.indexOf(element), 0, new PatternElement('string', self));
    };

    self.getTemplate = function(element) {
        return element.getTemplate();
    };

}

ko.bindingHandlers.slide = {
    init: function(element, valueAccessor) {
        var value = valueAccessor();
        $(element).toggle(ko.utils.unwrapObservable(value));
    },
    update: function(element, valueAccessor) {
        var value = valueAccessor();
        ko.utils.unwrapObservable(value) ? $(element).slideDown('fast') : $(element).slideUp('fast');
    }
};

$(document).ready(function() {
    ko.applyBindings(new AppViewModel());
});
