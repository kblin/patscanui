function VariationSet(mutations, insertions, deletions) {
    var self = this;
    self.mutations = ko.observable(mutations);
    self.insertions = ko.observable(insertions);
    self.deletions = ko.observable(deletions);
    self.show = ko.observable(false);

    self.getPattern = ko.computed(function() {
        var mut = parseInt(self.mutations()) || 0;
        var ins = parseInt(self.insertions()) || 0;
        var del = parseInt(self.deletions()) || 0;

        if (mut + ins + del < 1 || ! self.show()) {
            return "";
        }

        return "[" + mut + "," + ins + "," + del + "]";
    }, self);
}

function StringPattern(sequence, mutations, insertions, deletions) {
    var self = this;

    self.type = "string";
    self.named = ko.observable(false);
    self.sequence = ko.observable(sequence);
    self.variations = new VariationSet(mutations, insertions, deletions);

    self.getPattern = ko.computed(function() {
        if (!self.sequence()) {
            return "";
        }
        return self.sequence() + self.variations.getPattern();
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }

    self.reverseComplement = function() {
        self.sequence(reverse_complement(self.sequence()));
    }
}

function RangePattern(from, to) {
    var self = this;

    self.type = 'range';
    self.named = ko.observable(false);
    self.from = ko.observable(from);
    self.to = ko.observable(to);

    self.getPattern = ko.computed(function() {
        var from = parseInt(self.from());
        var to = parseInt(self.to());

        if (isNaN(from) || from < 0 ||
            isNaN(to) || to < 0) {
            return "";
        }

        return from + "..." + to;
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }
}

function ComplementPattern(selected, ruleset) {
    var self = this;

    self.type = 'complement';
    self.named = ko.observable(false);
    self.selected = ko.observable(selected);
    self.variations = new VariationSet();
    self.ruleset = ko.observable(ruleset);

    self.getPattern = ko.computed(function() {
        if (!self.selected()) {
            return "";
        }

        var view_model = GetViewModel();
        var name = view_model.getNamedPatternName(self.selected());
        var ruleset_name = self.ruleset() ? view_model.getNamedPatternName(self.ruleset()) : "";

        return ruleset_name + "~" + name + self.variations.getPattern();
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }
}

function RepeatPattern(selected) {
    var self = this;

    self.type = 'repeat';
    self.named = ko.observable(false);
    self.selected = ko.observable(selected);
    self.variations = new VariationSet();

    self.getPattern = ko.computed(function() {
        if (!self.selected()) {
            return "";
        }

        var view_model = GetViewModel();
        var name = view_model.getNamedPatternName(self.selected());

        return name + self.variations.getPattern();
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }
}

function AlternativePattern(patterns) {
    var self = this;

    self.type = 'alternative';
    self.named = ko.observable(false);
    patterns = patterns || [];
    self.sub_patterns = ko.observableArray(patterns);
    self.allow_named = false;

    self.getPattern = ko.computed(function() {
        if (!self.sub_patterns() || self.sub_patterns().length < 2) {
            return "";
        }

        var p1 = self.sub_patterns()[0].getPattern();
        var p2 = self.sub_patterns()[1].getPattern();

        if (!p1 || !p2) {
            return "";
        }

        return "(" + p1 + " | " + p2 + ")";

    }, self);

    self.getTemplateType = function() {
        return self.type;
    }

    self.canDrop = ko.computed(function() {
        return self.sub_patterns().length < 2;
    }, self);
}

function AnyOfPattern(sequence) {
    var self = this;

    self.type = 'anyof';
    self.named = ko.observable(false);
    self.sequence = ko.observable(sequence);

    self.getPattern = ko.computed(function() {
        if (!self.sequence()) {
            return "";
        }

        return "any(" + self.sequence() + ")";
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }
}

function NotAnyOfPattern(sequence) {
    var self = this;

    self.type = 'notanyof';
    self.named = ko.observable(false);
    self.sequence = ko.observable(sequence);

    self.getPattern = ko.computed(function() {
        if (!self.sequence()) {
            return "";
        }

        return "notany(" + self.sequence() + ")";
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }
}

function LengthLimitPattern(selected, length) {
    var self = this;

    self.type = 'length';
    self.named = ko.observable(false);
    selected = selected || [];
    self.selected = ko.observableArray(selected);
    self.length = ko.observable(length);

    self.getPattern = ko.computed(function() {
        var length = parseInt(self.length())
        if (self.selected().length < 1 || isNaN(length)) {
            return "";
        }

        var view_model = GetViewModel();
        var names = []
        for (i in self.selected()) {
            var el = self.selected()[i];
            names.push(view_model.getNamedPatternName(el));
        }

        return "length(" + names.join('+') + ") < " + length;
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }
}

function WeightColumn(a, c, g, t) {
    var self = this;
    self.a = ko.observable(a);
    self.c = ko.observable(c);
    self.g = ko.observable(g);
    self.t = ko.observable(t);

    self.getPattern = ko.computed(function (){
        var a = parseInt(self.a()) || 0;
        var c = parseInt(self.c()) || 0;
        var g = parseInt(self.g()) || 0;
        var t = parseInt(self.t()) || 0;

        if (a+c+g+t != 100) {
            return "";
        }
        return "(" + a + "," + c + "," + g + "," + t + ")";
    }, self);

    self.isInvalid = ko.computed(function (){
        var a = parseInt(self.a()) || 0;
        var c = parseInt(self.c()) || 0;
        var g = parseInt(self.g()) || 0;
        var t = parseInt(self.t()) || 0;

        if (a+c+g+t != 100) {
            return true;
        }
        return false;
    }, self);

}

function WeightPattern(matrix, weight) {
    var self = this;

    self.type = 'weight';
    self.named = ko.observable(false);
    matrix = matrix || [];
    self.matrix = ko.observableArray(matrix);
    self.weight = ko.observable(weight);

    self.getPattern = ko.computed(function() {
        var weight = parseInt(self.weight());

        if (self.matrix().length < 1 || isNaN(weight)) {
            return "";
        }

        var entries = self.matrix().map(function(item) { return item.getPattern(); }).join(',');

        entries = entries.replace(/,,+/g, ",").replace(/,$/, "");

        if (entries == "") {
            return "";
        }

        return "{" + entries + "} > " + weight;
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }

    self.addWeight = function() {
        self.matrix.push(new WeightColumn());
        GetViewModel().refreshButtons();
    }

    self.removeWeight = function(item) {
        self.matrix.remove(item);
    }
}

function ComplementPair(sequence) {
    var self = this;
    self.sequence = ko.observable(sequence);

    self.getPattern = ko.computed(function (){
        if (!self.sequence() || self.sequence().length != 2) {
            return "";
        }

        return self.sequence();
    }, self);

    self.isInvalid = ko.computed(function (){
        return !(self.sequence() && self.sequence().length == 2);
    }, self);

}

function ComplementRule(ruleset) {
    var self = this;

    self.type = 'complement-rule';
    self.named = ko.observable(true);
    ruleset = ruleset || [];
    self.ruleset = ko.observableArray(ruleset);

    self.getPattern = ko.computed(function() {
        if (self.ruleset().length < 1) {
            return "";
        }

        var entries = self.ruleset().map(function(item) { return item.getPattern(); }).join(',');

        entries = entries.replace(/,,+/g, ",").replace(/,$/, "");

        if (entries == "") {
            return "";
        }

        return "{" + entries + "}";
    }, self);

    self.getTemplateType = function() {
        return self.type;
    }

    self.addComplementPair = function() {
        self.ruleset.push(new ComplementPair());
        GetViewModel().refreshButtons();
    }

    self.removeComplementPair = function(item) {
        self.ruleset.remove(item);
    }
}

function PatScanViewModel() {
    var self = this;


    self.constructors = [
        { constructor: StringPattern, text: "String Pattern", show_for: "all" },
        { constructor: RangePattern, text: "Range Pattern", show_for: "all" },
        { constructor: ComplementPattern, text: "Complement Pattern", show_for: "DNA" },
        { constructor: RepeatPattern, text: "Repeat Pattern", show_for: "all" },
        { constructor: AlternativePattern, text: "Alternative Pattern", show_for: "all" },
        { constructor: AnyOfPattern, text: "Any-Of Pattern", show_for: "protein" },
        { constructor: NotAnyOfPattern, text: "Not-Any-Of Pattern", show_for: "protein" },
        { constructor: LengthLimitPattern, text: "Length Limit Pattern", show_for: "all" },
        { constructor: WeightPattern, text: "Weight Pattern", show_for: "DNA" },
        { constructor: ComplementRule, text: "Alternative Complementation Rule", show_for: "DNA" }
    ];

    self.pattern_list = ko.observableArray([]);
    self.trash = ko.observableArray([]);

    self.current_file = ko.observable('');

    self.molecule = ko.observable("DNA");
    self.allow_named = true;

    self.getTemplate = function(element) {
        return element.getTemplateType() + "-template";
    }

    self.namedPatterns = ko.computed(function() {
        var plist = self.pattern_list().filter(function(el) {
            if (el.type == "complement-rule")
                return false;
            return el.named();
        });
        return plist;
    }, self);

    self.complementRules = ko.computed(function() {
        var plist = self.pattern_list().filter(function(el) {
            if (el.type != "complement-rule")
                return false;
            return true;
        });
        return plist;
    }, self);

    self.pattern = ko.computed(function() {
        var plist = []
        for (i = 0; i < self.pattern_list().length; i++) {
            var el = self.pattern_list()[i];
            var name = el.named() ? self.getNamedPatternName(el) + "=" : "";
            var pattern = el.getPattern();
            if (pattern) {
                plist.push(name + pattern);
            }
        }
        return plist.join(' ');
    }, self);

    self._result = ko.observable();
    self.processing = ko.observable(false);

    self.result = ko.computed(function() {
        if (self.processing()) {
            return "Processing..."
        };
        return self._result();
    }, self);

    self.preview = ko.observable(false);

    self.getNamedPatternName = function(item) {
        var idx = self.namedPatterns().indexOf(item) + 1;
        if (idx > 0) {
            return "p" + idx;
        }
        idx = self.complementRules().indexOf(item) + 1;
        return "r" + idx;
    }

    self.refreshButtons = function(arg) {
        $('.toggle').button();
        $(".remove").button({
            icons: { primary: "ui-icon-trash" },
            text: false
        });
        $('.reverse-complement').button({
            icons: { primary: "ui-icon-transferthick-e-w" },
            text: false
        });
    }

    self.clearPatterns = function() {
        self.pattern_list.removeAll();
    }

    self.demo = function() {
        self.clearPatterns();
        self.pattern_list.push(new ComplementRule([ new ComplementPair("au"), new ComplementPair("ua"),
                                                    new ComplementPair("cg"), new ComplementPair("gc"),
                                                    new ComplementPair("gu"), new ComplementPair("ug") ]));
        self.pattern_list.push(new StringPattern("ATTGCA"));
        self.pattern_list.push(new RangePattern(23, 42));
        self.pattern_list.push(new AlternativePattern([new StringPattern("ATG"), new StringPattern("GTG")]));
        self.pattern_list()[1].named(true);
        self.pattern_list()[2].named(true);
        self.pattern_list.push(new ComplementPattern(self.pattern_list()[2], self.pattern_list()[0]));
        self.pattern_list.push(new RepeatPattern(self.pattern_list()[1]));
        self.pattern_list()[4].variations.mutations(1);
        self.pattern_list()[4].variations.show(true);
        self.pattern_list.push(new RangePattern(17, 23));
        self.pattern_list()[6].named(true);
        self.pattern_list.push(new LengthLimitPattern([self.pattern_list()[2], self.pattern_list()[6]], 50));

        self.pattern_list.push( new WeightPattern([ new WeightColumn(10,20,30,40), new WeightColumn(20,30,40,10),
                                                    new WeightColumn(30,40,10,20), new WeightColumn(40,10,20,30)], 100));
        self.refreshButtons();
    }

    self.upload_message = ko.observable("Before you start, please uplaod the DNA FASTA file you want to search.");

    self.showUploadMenu = ko.computed(function() {
        if (self.current_file() == '') {
            return true;
        }
        return false;
    }, self);

    self.periodic_update = ko.computed(function() {
        if (!self.preview()) {
            return;
        }
        if (self.pattern() == '') {
            return;
        }
        self.submit();
    }).extend({ throttle: 10000 });

    self.submit = function() {
        if (self.pattern() == '') {
            return;
        }
        console.log("Submitting: " + self.pattern());
        self.processing(true);
        setTimeout(function() {
            self.processing(false);
            self._result('fake result at ' + new Date());
        }, 2000);
    }

    // Fake value to allow retriggering the validity check
    self.validity_check = ko.observable(false);
    self.session_still_valid = ko.computed(function() {
        if (self.current_file() == '') {
            return false;
        }
        $.getJSON('check/' + self.current_file(),
            function(data) {
                if (!data.available) {
                    self.upload_message("Session timed out, please reupload file");
                    self.current_file('');
                }
            });

        // and now flip the fake value to trigger reevaluation
        self.validity_check(!self.validity_check())
        return true;
    }).extend({ throttle: 5000 });
}

function SetViewModel(view_model) {
    $(document).data('view_model', view_model);
}

function GetViewModel() {
    return $(document).data('view_model');
}


