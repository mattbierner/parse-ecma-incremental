requirejs.config({
    paths: {
        'ecma': '../parse-ecma/lib',
        'parse': '../parse/lib',
        'nu': 'dependencies/nu/lib',
        'ecma_ast': 'dependencies/ecma-ast/lib',
        'seshat': 'dependencies/seshat/lib/seshat'
    }
});

require([
    'parse/parse',
    'parse/lang',
    'parse/incremental',
    'nu/stream',
    'ecma/position',
    'ecma/lex/lexer',
    'ecma/parse/parser',
    'ecma/parse/program_parser',
    'ecma_ast/node'],
function(
    parse,
    lang,
    incremental,
    stream,
    position,
    lexer,
    parser,
    program,
    node)
{
    
var printNodes = function(nodes) {
    lexOut.children().remove();

    stream.forEach(function(v) {
        var type =  v.type,
            value = (type === 'Whitespace' ? '' : v.value),
            location = v.loc;
        lexOut.append($("<span class='Token'>" + value + "</span>")
            .addClass(function() {
                if (v.type === 'Whitespace' && v.value === '\t') {
                    return v.type + " Tab";
                }
                return v.type;
            }).data({
                'type': type,
                'value': value,
                'location': location
            }));
    }, nodes);
};

/* Table
 ******************************************************************************/
var table = [];

var getClosest = function(table, index) {
    if (index < 0)
        return 0;
    
    var l = table[index];
    if (!l)
        return getClosest(table, index - 1);
    return index;
};

/* Code Mirror
 ******************************************************************************/
var cm = CodeMirror(document.getElementById('input'), {
    'mode': 'javascript',
    'lineNumbers': true
});
var doc = cm.doc;

var docStart = {'line': 0, 'ch': 0},
    docEnd = {'line': Infinity, 'ch': Infinity};

cm.on('change', function(cm, change) {
    var text = text = change.text.join("\n");
    
    var startIndex = cm.indexFromPos(change.from),
        endIndex = startIndex + text.length;
    
    var start = change.from,
        end = cm.posFromIndex(endIndex);
    
    var pre = cm.doc.getRange(docStart, start),
        post = cm.getRange(end, docEnd);
    
    var closest = getClosest(table, startIndex);
    
    var preText = cm.doc.getRange(cm.posFromIndex(closest), start);
    var c1 = incremental.provideString(table[closest] || base, preText);
    table[closest] = c1;
    
    var c2 = incremental.provideString(c1, text);
    table[endIndex] = c2;
    incremental.finish(incremental.provideString(c2, post));
});

/* Parsing
 ******************************************************************************/
var base = incremental.parseIncState(
    lang.then(parse.many(lexer.inputElementRegExp), parse.eof),
    new parse.ParserState(
        stream.end,
        position.SourcePosition.initial),
    function(x) {
        $('.LexError').text('');
        printNodes(x);
    },
    function(x){
        $('.LexError').text(x);
    });
/*
var baseParser = incremental.parseIncState(
    parse.next(
        parse.bind(parse.getParserState, function(x) {
            return x.state.next(null);
        }),
        program.program),
    new parser.ParserState(
        stream.end,
        position.SourcePosition.initial,
        {},
        stream.end,
        position.SourcePosition.initial),
    function(ast) {
        $('.ParseOut').children().remove();
        walk(ast, function(x){
            $('.ParseOut').append(x);
        });
    },
    function(x){
        $('.ParseError').text(x);
    });
*/
/* 
 ******************************************************************************/
var lexOut = $('.LexOut');

var walk = function(ast, f) {
    if (ast instanceof node.Node) {
        var n = $("<div class='Node " + ast.type +"'><span class='NodeType'>"+ast.type+"</span></div>")
            .data('location', ast.loc);
        
        Object.keys(ast).forEach(function(key) {
            walk(ast[key], function(x) { n.append($("<div>" + key + ": </div>").append(x)); });
        });
        return f(n);
    }
    if (Array.isArray(ast)) {
        var n = $("<div class='Array'></div>");
        
        for (var i = 0; i < ast.length; ++i) {
            walk(ast[i], function(x) { n.append(x); });
        }
        return f(n);
    }
    return f($("<span>" + ast + "</span>"));
};

$('.Token').live('hover', function() {
    $('.TokenInfo .TypeInfo .Value').text($(this).data('type'));
    $('.TokenInfo .ValueInfo .Value').text($(this).data('value'));
    $('.TokenInfo .LocationInfo .Value').text($(this).data('location'));
});

$('.Node').live('mouseover mouseout', function(event) {
    event.stopPropagation();
    
    var nodeLoc = $(this).data('location');
    if (event.type == 'mouseover') {
        $(this).addClass('Active');
        lexOut.children().each(function(){
            var loc = $(this).data('location');
            if (loc.start.compare(nodeLoc.start) >= 0) {
                if (loc.end.compare(nodeLoc.end) <= 0) {
                    $(this).addClass('Active');
                } else {
                    return false;
                }
            }
        });
    } else {
        $(this).removeClass('Active');
        lexOut.children('.Active').removeClass('Active');
    }
});

$('button').click(function() {
    var input = doc.getValue();
    
    lexOut.children().remove();
    $('.ParseOut').children().remove();
    $('.ParseOut').text('');
    $('.ParseError').text('');
    $('.LexError').text('');
    
    var nodes, ast;
    
    var lex;
    switch($("input:radio:checked").val()) {
    case 'div':
        lex = lexer.lexDiv;
        break;
    default:
        lex = lexer.lexRegExp;
        break;
    }
    
    try {
        nodes = lex(input);
    } catch (e) {
        $('.LexError').text(e);
    }
    
     stream.forEach(function(v) {
        var type =  v.type,
            value = (type === 'Whitespace' ? '' : v.value),
            location = v.loc;
        lexOut.append($("<span class='Token'>" + value + "</span>")
            .addClass(function() {
                if (v.type === 'Whitespace' && v.value === '\t') {
                    return v.type + " Tab";
                }
                return v.type;
            }).data({
                'type': type,
                'value': value,
                'location': location
            }));
    }, nodes);
    
    try
    {
        ast = parser.parse(input);
    } catch (e) {
        $('.ParseError').text(e);
        return;
    }

    $('.ParseError').text('');
    $('.LexError').text('');
    
   
    
    walk(ast, function(x){
        $('.ParseOut').append(x);
    });
});

});
