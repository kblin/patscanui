function complement_base(base) {
    var bases = "ACGTMRWSYKVHDBNacgtmrwsykvhdbn";
    var complements = "TGCAKYWSRMBDHVNtgcakywsrmbdhvn";

    var idx = bases.indexOf(base);
    if (idx == -1) {
        return 'N';
    }
    return complements.charAt(idx);
}

function complement(seq) {
    if (!seq) {
        return undefined;
    }
    var bases = seq.split('');
    var complements = bases.map(complement_base);
    return complements.join('');
}

function reverse(seq) {
    if (!seq) {
        return undefined;
    }
    return seq.split('').reverse().join('');
}

function reverse_complement(seq) {
    if (!seq) {
        return undefined;
    }
    var bases = seq.split('').reverse();
    var complements = bases.map(complement_base);
    return complements.join('');
}
