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

    self.toJS = function() {
        return { mutations: self.mutations(),
                 insertions: self.insertions(),
                 deletions: self.deletions(),
                 active: self.show() };
    }

    self.fromJS = function(obj) {
        self.mutations(obj.mutations);
        self.insertions(obj.insertions);
        self.deletions(obj.deletions);
        self.show(obj.active);
    }
}

function Pattern(type) {
    var self = this;
    self.type = type;
    self.named = ko.observable(false);

    self.getTemplateType = function() {
        return self.type;
    }

    self.updateName = function(data, event) {
        /* Events propagate in the wrong order, so instead of setting the value right away,
         * we set it after a short timeout */
        setTimeout(function() {
            var view_model = GetViewModel()
            view_model.refreshButtons();
        }, 1);
        return true;
    }

    self.toJS = function() {
        return { type: self.type,
                 named: self.named() };
    }

    self.fromJS = function(obj) {
        self.named(obj.named);
        self.type = obj.type;
    }

}

function StringPattern(sequence, mutations, insertions, deletions) {
    var self = Object.create(new Pattern('string'));

    self.sequence = ko.observable(sequence);
    self.variations = new VariationSet(mutations, insertions, deletions);

    self.getPattern = ko.computed(function() {
        if (!self.sequence()) {
            return "";
        }
        return self.sequence() + self.variations.getPattern();
    }, self);

    self.reverseComplement = function() {
        self.sequence(reverse_complement(self.sequence()));
    }

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.variations = self.variations.toJS();
        obj.sequence = self.sequence();
        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        /* In order to correctly calculate deps, set up variations before
         * setting up the sequence */
        self.variations = new VariationSet();
        self.variations.fromJS(obj.variations);
        self.sequence(obj.sequence);
    }
    return self;
}

function RangePattern(from, to) {
    var self = Object.create(new Pattern('range'));

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

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.from = self.from();
        obj.to = self.to();
        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        self.from(obj.from);
        self.to(obj.to);
    }
    return self;
}

function ComplementPattern(selected, ruleset) {
    var self = Object.create(new Pattern('complement'));

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

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.variations = self.variations.toJS();

        var view_model = GetViewModel();
        obj.selected = view_model.getNamedPatternName(self.selected());
        obj.ruleset = self.ruleset() ? view_model.getNamedPatternName(self.ruleset()) : "";

        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        self.variations = new VariationSet();
        self.variations.fromJS(obj.variations);

        var view_model = GetViewModel();
        var ruleset = obj.ruleset ? view_model.getPatternByName(obj.ruleset) : undefined;
        var selected = obj.selected ? view_model.getPatternByName(obj.selected) : undefined;

        self.ruleset(ruleset);
        self.selected(selected);
    }
    return self;
}

function RepeatPattern(selected) {
    var self = Object.create(new Pattern('repeat'));

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

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.variations = self.variations.toJS();

        var view_model = GetViewModel();
        obj.selected = view_model.getNamedPatternName(self.selected());

        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        self.variations = new VariationSet();
        self.variations.fromJS(obj.variations);

        var view_model = GetViewModel();
        var selected = obj.selected ? view_model.getPatternByName(obj.selected) : undefined;

        self.selected(selected);
    }
    return self;
}

function AlternativePattern(patterns) {
    var self = Object.create(new Pattern('alternative'));

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

    self.canDrop = ko.computed(function() {
        return self.sub_patterns().length < 2;
    }, self);

    self.removePattern = function(pattern) {
        self.sub_patterns.remove(pattern);
    }

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.sub_patterns = self.sub_patterns().map(function(el) {
            return el.toJS();
        });
        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        var sub_patterns = obj.sub_patterns.map(function(el) {
            var view_model = GetViewModel();
            var constructor = view_model.getConstructorByType(el.type);
            if (!constructor) {
                return;
            }
            var pattern = new constructor();
            pattern.fromJS(el);
            return pattern;
        });

        sub_patterns = sub_patterns.filter(function(val) {
            return !(typeof val === 'undefined');
        });

        self.sub_patterns(sub_patterns);
    }
    return self;
}

function AnyOfPattern(sequence) {
    var self = Object.create(new Pattern('anyof'));

    self.sequence = ko.observable(sequence);

    self.getPattern = ko.computed(function() {
        if (!self.sequence()) {
            return "";
        }

        return "any(" + self.sequence() + ")";
    }, self);

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.sequence = self.sequence();
        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        self.sequence(obj.sequence);
    }
    return self;
}

function NotAnyOfPattern(sequence) {
    var self = Object.create(new Pattern('notanyof'));

    self.sequence = ko.observable(sequence);

    self.getPattern = ko.computed(function() {
        if (!self.sequence()) {
            return "";
        }

        return "notany(" + self.sequence() + ")";
    }, self);

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.sequence = self.sequence();
        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        self.sequence(obj.sequence);
    }
    return self;
}

function LengthLimitPattern(selected, length) {
    var self = Object.create(new Pattern('length'));

    selected = selected || [];
    self.selected = ko.observableArray(selected);
    self.length = ko.observable(length);

    self.selectedNames = function() {
        var view_model = GetViewModel();
        var names = []
        for (i in self.selected()) {
            var el = self.selected()[i];
            names.push(view_model.getNamedPatternName(el));
        }
        return names;
    }

    self.getPattern = ko.computed(function() {
        var length = parseInt(self.length())
        if (self.selected().length < 1 || isNaN(length)) {
            return "";
        }

        var view_model = GetViewModel();
        var names = self.selectedNames();

        return "length(" + names.join('+') + ") < " + length;
    }, self);

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.length = self.length();
        obj.selected = self.selectedNames();
        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        self.length(obj.length);

        var view_model = GetViewModel();
        var selected = obj.selected.map(function(el) {
            return view_model.getPatternByName(el);
        });

        self.selected(selected);
    }
    return self;
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

    self.toJS = function() {
        return { a: self.a(), c: self.c(), g: self.g(), t: self.t() };
    }

    self.fromJS = function(obj) {
        self.a(obj.a);
        self.c(obj.c);
        self.g(obj.g);
        self.t(obj.t);
    }
    return self;
}

function WeightPattern(matrix, weight) {
    var self = Object.create(new Pattern('weight'));

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

    self.addWeight = function() {
        self.matrix.push(new WeightColumn());
        GetViewModel().refreshButtons();
    }

    self.removeWeight = function(item) {
        self.matrix.remove(item);
    }

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.matrix = self.matrix().map(function(el) {
            return el.toJS();
        });
        obj.weight = self.weight();

        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);

        var matrix = obj.matrix.map(function(el) {
            var col = new WeightColumn();
            col.fromJS(el);
            return col;
        });
        self.matrix(matrix);

        self.weight(obj.weight);
    }
    return self;
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

    self.toJS = function() {
        return { sequence: self.sequence() };
    }

   self.fromJS = function(obj) {
      self.sequence(obj.sequence);
   }
}

function ComplementRule(ruleset) {
    var self = Object.create(new Pattern('complement-rule'));

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

    self.addComplementPair = function() {
        self.ruleset.push(new ComplementPair());
        GetViewModel().refreshButtons();
    }

    self.removeComplementPair = function(item) {
        self.ruleset.remove(item);
    }

    self.toJS = function() {
        var obj = self.__proto__.toJS();
        obj.ruleset = self.ruleset().map(function(el) {
            return el.toJS();
        });
        return obj;
    }

    self.fromJS = function(obj) {
        self.__proto__.fromJS(obj);
        var ruleset = obj.ruleset.map(function(el) {
            var pair = new ComplementPair();
            pair.fromJS(el);
            return pair;
        });
        self.ruleset(ruleset);
    }
    return self;
}

function PatScanViewModel() {
    var self = this;


    self.constructors = [
        { constructor: StringPattern, type: 'string', text: "String Pattern", show_for: "all" },
        { constructor: RangePattern, type: 'range', text: "Range Pattern", show_for: "all" },
        { constructor: ComplementPattern, type: 'complement', text: "Complement Pattern", show_for: "DNA" },
        { constructor: RepeatPattern, type: 'repeat', text: "Repeat Pattern", show_for: "all" },
        { constructor: AlternativePattern, type: 'alternative', text: "Alternative Pattern", show_for: "all" },
        { constructor: AnyOfPattern, type: 'anyof', text: "Any-Of Pattern", show_for: "protein" },
        { constructor: NotAnyOfPattern, type: 'notanyof', text: "Not-Any-Of Pattern", show_for: "protein" },
        { constructor: LengthLimitPattern, type: 'length', text: "Length Limit Pattern", show_for: "all" },
        { constructor: WeightPattern, type: 'weight', text: "Weight Pattern", show_for: "DNA" },
        { constructor: ComplementRule, type: 'complement-rule', text: "Alternative Complementation Rule", show_for: "DNA" }
    ];

    self.pattern_list = ko.observableArray([new StringPattern()]);

    self.current_file = ko.observable('');

    self.molecule = ko.observable("DNA");
    self.allow_named = true;

    self.provided = ko.observable(false);

    self.getTemplate = function(element) {
        return element.getTemplateType() + "-template";
    }

    self.example = function() {
        self.provided(self.allProvidedFiles()[0]);
        self.clearPatterns()
        self.pattern_list.push(new StringPattern("C"));
        self.pattern_list.push(new RangePattern(5, 6));
        self.pattern_list()[1].named(true)
        self.pattern_list.push(new StringPattern("GAGAG"));
        self.pattern_list.push(new ComplementPattern(self.pattern_list()[1]));
        self.refreshButtons();
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
    self.last_pattern = ko.observable('');

    self._result = ko.observable();
    self.processing = ko.observable(false);

    self.result = ko.computed(function() {
        if (self.processing()) {
            return "Processing..."
        };
        return self._result();
    }, self);

    self.result_cols = ko.computed(function() {
        if (! self._result()) {
            return 0;
        }

        var lines = self._result().split('\n');
        var max_len = -1;
        for (i in lines) {
            max_len = lines[i].length > max_len ? lines[i].length : max_len;
        }
        return Math.max(80, max_len);
    }, self);

    self.result_rows = ko.computed(function() {
        if (! self._result()) {
            return 0;
        }
        return self._result().split('\n').length;
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

    self.getPatternByName = function(name) {
        var idx = parseInt(name.substring(1)) - 1;
        if (name.charAt(0) == "r") {
            return self.complementRules()[idx];
        }
        return self.namedPatterns()[idx];
    }

    self.getConstructorByType = function(type) {
        var constructor = undefined;
        for (i in self.constructors) {
            c = self.constructors[i];
            if (c.type != type) {
                continue;
            }
            constructor = c.constructor;
            break;
        }
        return constructor;
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
        $(".pattern-label").each(function() {
            var pattern = ko.dataFor(this);
            var name = pattern.named() ? self.getNamedPatternName(pattern) : "unnamed";
            $(this).children()[0].innerText = name;
        });
    }

    self.removePattern = function(pattern) {
        self.pattern_list.remove(pattern);
    }

    self.clearPatterns = function() {
        self.pattern_list.removeAll();
    }

    self.new_seq = function() {
        self.provided(null);
        self.current_file('');
        self._result(null);
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

    self.upload_message = ko.observable("Before you start, please upload the DNA FASTA file you want to search");

    self.showUploadMenu = ko.computed(function() {
        if (self.provided()) {
            self.current_file(self.provided());
        }

        if (self.current_file() == '') {
            return true;
        }
        return false;
    }, self);

    self.allProvidedFiles = ko.observableArray([]);

    self.periodic_update = ko.computed(function() {
        if (!self.preview()) {
            return;
        }
        if (self.pattern() == '') {
            return;
        }

        /* In theory we should only be called if the pattern changed,
         * but if the user clicked submit during the wait time, we already
         * know the results for this pattern
         */
        if (self.last_pattern() == self.pattern()) {
            return;
        }

        // session might have timed out while waiting
        if (self.current_file() == '') {
            return;
        }

        self.submit();
    }).extend({ throttle: 10000 });

    self.submit = function() {
        if (self.pattern() == '') {
            return;
        }
        self.processing(true);
        var data = { pattern: self.pattern(),
                     filename: self.current_file(),
                     provided: self.provided() ? "true" : "false",
                     molecule: self.molecule()
                   };
        $.post('analyze', data, function(data) {
            self.processing(false);
            self.last_pattern(self.pattern());

            // Don't overwrite results when session is expired.
            if (data == "session expired") {
                return;
            }

            if (data == "") {
                self._result("No results found for input pattern.");
                return;
            }

            self._result(data);
        }, 'text');
    }

    // Fake value to allow retriggering the validity check
    self.validity_check = ko.observable(false);
    self.session_still_valid = ko.computed(function() {
        if (self.provided()) {
            return true;
        }
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

    self.toJS = function() {
        var elements = self.pattern_list().map(function(el) {
            return el.toJS();
        });
        return { elements: elements,
                 molecule_type: self.molecule() };
    }

    self.json = ko.observable();

    self.save = function() {
        var json = JSON.stringify(self.toJS(), null, 2);
        self.json(json);
    }

    self.load = function() {
        if (self.json() === undefined) {
            return;
        }

        var obj = JSON.parse(self.json());
        if (obj.molecule_type == "protein") {
            self.molecule("protein");
        } else {
            self.molecule("DNA");
        }

        self.clearPatterns();

        for (i in obj.elements) {
            var el = obj.elements[i];
            var constructor = self.getConstructorByType(el.type);
            if (!constructor) {
                console.log("Invalid element type " + el.type);
                continue;
            }

            var pattern = new constructor();
            pattern.fromJS(el);
            self.pattern_list.push(pattern);
        }
        self.refreshButtons();
        self.json('');
    }
}

function SetViewModel(view_model) {
    $(document).data('view_model', view_model);
}

function GetViewModel() {
    return $(document).data('view_model');
}


