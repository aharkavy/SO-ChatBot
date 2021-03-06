(function () {
"use strict";

var commands = {
	help : function ( args ) {
		if ( args.length ) {

			var cmd = bot.getCommand( args );
			if ( cmd.error ) {
				return cmd.error;
			}

			var desc = cmd.description || 'No info is available';

			return args + ': ' + desc;
		}

		return (
			'https://github.com/Zirak/SO-ChatBot/wiki/' +
				'Interacting-with-the-bot'
		);
	},

	listen : function ( msg ) {
		return bot.callListeners( msg );
	},

	live : function () {
		if ( !bot.stopped ) {
			return 'I\'m not dead! Honest!';
		}
		bot.continue();
		return 'And on this day, you shall paint eggs for a giant bunny.';
	},

	die : function () {
		if ( bot.stopped ) {
			return 'Kill me once, shame on you, kill me twice...';
		}
		bot.stop();
		return 'You killed me!';
	},

	forget : function ( args ) {
		var name = args.toLowerCase(),
			cmd = bot.getCommand( name );

		if ( cmd.error ) {
			return cmd.error;
		}

		if ( !cmd.canDel(args.get('user_id')) ) {
			return 'You are not authorized to delete the command ' + args;
		}

		cmd.del();
		return 'Command ' + name + ' forgotten.';
	},

	ban : function ( args ) {
		var msg = '';
		args.parse().map(function ( usrid ) {
			var id = Number( usrid );
			//name provided instead of id
			if ( /^\d+$/.test(usrid) ) {
				id = args.findUserid( usrid );
			}

			if ( !id ) {
				msg += 'Cannot find user ' + usrid + '. ';
			}
			else if ( bot.isOwner(id) ) {
				msg += 'Cannot mindjail owner ' + usrid + '. ';
				id = -1;
			}

			return id;
		}).forEach( ban );

		return msg;

		function ban ( id ) {
			if ( id < 0 ) {
				return;
			}

			if ( bot.banlist.contains(id) ) {
				msg += 'User ' + id + ' already in mindjail. ';
			}
			else {
				bot.banlist.add( id );
				msg += 'User ' + id + ' added to mindjail. ';
			}
		}
	},

	unban : function ( args ) {
		var msg = '';
		args.parse().map(function ( usrid ) {
			var id = Number( usrid );
			//name provided instead of id
			if ( /^\d+$/.test(usrid) ) {
				id = args.findUserid( usrid );
			}

			if ( !id ) {
				msg += 'Cannot find user ' + usrid + '. ';
			}

			return Number( id );
		}).forEach( unban );

		return msg;

		function unban ( id ) {
			if ( !bot.banlist.contains(id) ) {
				msg += 'User ' + id + ' isn\'t in mindjail. ';
			}
			else {
				bot.banlist.remove( id );
				msg += 'User ' + id + ' freed from mindjail. ';
			}
		}
	},

	regex : function ( args ) {
		var parts = args.parse(),

			what = parts.shift(),
			pattern = parts.shift(),
			flags = parts.shift() || '',

			regex = new RegExp( pattern, flags.toLowerCase() ),
			matches = regex.exec( what );

		bot.log( what, pattern, flags, regex, 'regex parsed' );
		bot.log( matches, 'regex matched' );

		if ( !matches ) {
			return 'No matches.';
		}

		return matches.map(function ( match ) {
			return '`' + match + '`';
		}).join( ', ' );
	},

	jquery : function jquery ( args ) {
		//check to see if more than one thing is requested
		var parsed = args.parse( true );
		if ( parsed.length > 1 ) {
			return parsed.map( jquery ).join( ' ' );
		}

		var props = args.trim().replace( /^\$/, 'jQuery' ),

			parts = props.split( '.' ), exists = false,
			url = props, msg;
		//parts will contain two likely components, depending on the input
		// jQuery.fn.prop -  parts[0] = jQuery, parts[1] = prop
		// jQuery.prop    -  parts[0] = jQuery, parts[1] = prop
		// prop           -  parts[0] = prop
		//
		//jQuery API urls works like this:
		// if it's on the jQuery object, then the url is /jQuery.property
		// if it's on the proto, then the url is /property
		//
		//so, the mapping goes like this:
		// jQuery.fn.prop => prop
		// jQuery.prop    => jQuery.prop if it's on jQuery
		// prop           => prop if it's on jQuery.prototype,
		//                     jQuery.prop if it's on jQuery

		bot.log( props, parts, '/jquery input' );

		//user gave something like jQuery.fn.prop, turn that to just prop
		// jQuery.fn.prop => prop
		if ( parts.length === 3 ) {
			parts = [ parts[2] ];
		}

		//check to see if it's a property on the jQuery object itself
		// jQuery.prop => jQuery.prop
		if ( parts[0] === 'jQuery' && jQuery[parts[1]] ) {
			exists = true;
		}

		//user wants something on the prototype?
		// prop => prop
		else if ( parts.length === 1 && jQuery.prototype[parts[0]] ) {
			url = parts[ 0 ];
			exists = true;
		}

		//user just wanted a property? maybe.
		// prop => jQuery.prop
		else if ( jQuery[parts[0]] ) {
			url = 'jQuery.' + parts[0];
			exists = true;
		}

		if ( exists ) {
			msg = 'http://api.jquery.com/' + url;
		}
		else {
			msg = 'http://api.jquery.com/?s=' + encodeURIComponent( args );
		}
		bot.log( msg, '/jquery link' );

		return msg;
	},

	choose : function ( args ) {
		var opts = args.parse();
		bot.log( opts, '/choose input' );

		return opts[ Math.floor(Math.random() * opts.length) ];
	},

	user : function ( args ) {
		var props = args.parse(),
			usrid = props[ 0 ] || args.get( 'user_id' ),
			id = usrid;

		//check for searching by username
		if ( !(/^\d+$/.test(usrid)) ) {
			id = args.findUserid( usrid );

			if ( !id ) {
				return 'Can\'t find user ' + usrid + ' in this chatroom.';
			}
		}

		args.directreply( 'http://stackoverflow.com/users/' + id );
	},

	listcommands : function () {
		return 'Available commands: ' +
			Object.keys( bot.commands ).join( ', ' );
	}
};

commands.define = (function () {
var cache = Object.create( null );

//cb is for internal usage by other commands/listeners
return function ( args, cb ) {
	//we already defined it, grab from memory
	//unless you have alzheimer
	//in which case, you have bigger problems
	if ( cache[args] ) {
		return finish( cache[args] );
	}

	var duckyAPI = 'http://api.duckduckgo.com/?',
		params = {
			q : 'define ' + args,
			format : 'json'
		};

	IO.jsonp({
		//talk to the duck!
		url : duckyAPI,
		fun : finishCall,
		data : params,
		jsonpName : 'callback'
	});

	//the duck talked back! either the xhr is complete, or the hallucinations
	// are back
	function finishCall ( resp ) {
		var url = resp.AbstractURL,
			def = resp.AbstractText;

		bot.log( url, def, '/define finishCall input' );

		//Webster returns the definition as
		// wordName definition: the actual definition
		// instead of just the actual definition
		if ( resp.AbstractSource === 'Merriam-Webster' ) {
			def = def.replace( args + ' definition: ', '' );
			bot.log( def, '/define finishCall webster' );
		}

		if ( !def ) {
			def = 'Could not find definition for ' + args;
		}
		else {
			def = args + ': ' + def; //problem?
			//the chat treats ( as a special character, so we escape!
			def += ' [\\(source\\)](' + url + ')';
		}
		bot.log( def, '/define finishCall output' );

		//add to cache
		cache[ args ] = def;

		finish( def );
	}

	function finish ( def ) {
		if ( cb && cb.call ) {
			cb( def );
		}
		else {
			args.directreply( def );
		}
	}
};
}());
commands.define.async = true;

//cb is for internal usage by other commands/listeners
commands.norris = function ( args, cb ) {
	var chucky = 'http://api.icndb.com/jokes/random';

	IO.jsonp({
		url : chucky,
		fun : finishCall,
		jsonpName : 'callback'
	});

	function finishCall ( resp ) {
		var msg;

		if ( resp.type !== 'success' ) {
			msg = 'Chuck Norris is too awesome for this API. Try again.';
		}
		else {
			msg = IO.decodehtmlEntities( resp.value.joke );
		}

		if ( cb && cb.call ) {
			cb( msg );
		}
		else {
			args.reply( msg );
		}
	}
};
commands.norris.async = true;

//cb is for internal blah blah blah
commands.urban = (function () {
var cache = Object.create( null );

return function ( args, cb ) {
	if ( !args.length ) {
		return 'Y U NO PROVIDE ARGUMENTS!?';
	}

	if ( cache[args] ) {
		return finish( cache[args] );
	}

	IO.jsonp({
		url:'http://www.urbandictionary.com/iphone/search/define',
		data : {
			term : args.content
		},
		jsonpName : 'callback',
		fun : complete
	});

	function complete ( resp ) {
		var msg, top;

		if ( resp.result_type === 'no_results' ) {
			msg = 'Y U NO MAEK SENSE!!!???!!?11 No results for ' + args;
		}
		else {
			top = resp.list[ 0 ];
			msg = '[' + args + '](' + top.permalink + '): ' + top.definition;
		}
		cache[ args ] = msg;

		finish( msg );
	}

	function finish ( def ) {
		if ( cb && cb.call ) {
			cb( def );
		}
		else {
			args.reply( def );
		}
	}
};
}());
commands.urban.async = true;

var parse = commands.parse = (function () {
var macros = {
	who : function () {
		return [].pop.call( arguments ).get( 'user_name' );
	},

	someone : function () {
		var presentUsers = document.getElementById( 'sidebar' )
			.getElementsByClassName( 'present-user' );

		//the chat keeps a low opacity for users who remained silent for long,
		// and high opacity for those who recently talked
		var active = [].filter.call( presentUsers, function ( user ) {
			return Number( user.style.opacity ) >= 0.5;
		}),
		user = active[ Math.floor(Math.random() * (active.length-1)) ];

		if ( !user ) {
			return 'Nobody! I\'m all alone :(';
		}

		return user.getElementsByTagName( 'img' )[ 0 ].title;
	},

	digit : function () {
		return Math.floor( Math.random() * 10 );
	},

	encode : function ( string ) {
		return encodeURIComponent( string );
	},

	//random number, min <= n <= max
	//treats non-numeric inputs like they don't exist
	rand : function ( min, max ) {
		min = Number( min );
		max = Number( max );

		//handle rand() === rand( 0, 9 )
		if ( !min ) {
			min = 0;
			max = 9;
		}

		//handle rand( max ) === rand( 0, max )
		else if ( !max ) {
			max = min;
			min = 0;
		}

		return Math.floor( Math.random() * (max - min + 1) ) + min;
	}
};
var macroRegex = /(?:.|^)\$(\w+)(?:\((.*?)\))?/g;

//extraVars is for internal usage via other commands
return function parse ( args, extraVars ) {
	extraVars = extraVars || {};
	bot.log( args, extraVars, '/parse input' );

	return args.replace( macroRegex, replaceMacro );

	function replaceMacro ( $0, filler, fillerArgs ) {
		//$$ makes a literal $
		if ( $0.startsWith('$$') ) {
			return $0.slice( 1 );
		}

		//include the character that was matched in the $$ check, unless
		// it's a $
		var ret = '';
		if ( $0[0] !== '$' ) {
			ret = $0[ 0 ];
		}

		fillerArgs = parseMacroArgs( fillerArgs );

		var macro;
		//check for the function's existance in the funcs object
		if ( macros.hasOwnProperty(filler) ) {
			bot.log( filler, fillerArgs, '/parse func call');
			macro = macros[ filler ];
		}

		//it's passed as an extra function
		else if ( extraVars.hasOwnProperty(filler) ) {
			macro = extraVars[ filler ];
		}

		//when the macro is a function
		if ( macro.apply ) {
			ret += macro.apply( null, fillerArgs );
		}
		//when the macro is simply a substitution
		else {
			ret += macro;
		}
		return ret;
	}

	function parseMacroArgs ( macroArgs ) {
		console.log( macroArgs, '/parse parseMacroArgs' );
		if ( !macroArgs ) {
			return [];
		}

		//parse the arguments, split them into individual arguments,
		// and trim'em (to cover the case of "arg,arg" and "arg, arg")
		return (
			parse( macroArgs, extraVars )
				.split( ',' ).invoke( 'trim' ).concat( args )
		);
	}
};
}());

commands.tell = (function () {

var invalidCommands = { tell : true, forget : true };

return function ( args ) {
	var props = args.parse();
	bot.log( args.valueOf(), props, '/tell input' );

	var replyTo = props[ 0 ],
		cmdName = props[ 1 ],
		cmd;

	if ( !replyTo || !cmdName ) {
		return 'Invalid /tell arguments. Use /help for usage info';
	}

	cmd = bot.getCommand( cmdName );
	if ( cmd.error ) {
		return cmd.error;
	}

	if ( invalidCommands.hasOwnProperty(cmdName) ) {
		return 'Command ' + cmdName + ' cannot be used in /tell.';
	}

	if ( !cmd.canUse(args.get('user_id')) ) {
		return 'You do not have permission to use command ' + cmdName;
	}

	//check if the user wants to reply to a message
	var direct = false, msgObj = args.get();
	if ( /^:?\d+$/.test(replyTo) ) {
		msgObj.message_id = replyTo.replace( /^:/, '' );
		direct = true;
	}
	else {
		msgObj.user_name = replyTo.replace( /^@/, '' );
	}

	var cmdArgs = bot.Message(
		//the + 2 is for the two spaces after each arg
		// /tell replyTo1cmdName2args
		args.slice( replyTo.length + cmdName.length + 2 ).trim(),
		msgObj
	);
	bot.log( cmdArgs, '/tell calling ' + cmdName );

	//if the command is async, it'll accept a callback
	if ( cmd.async ) {
		cmd.exec( cmdArgs, callFinished );
	}
	else {
		callFinished( cmd.exec(cmdArgs) );
	}

	function callFinished ( res ) {
		if ( !res ) {
			return;
		}

		if ( direct ) {
			args.directreply( res );
		}
		else {
			args.reply( res );
		}
	}
};
}());

commands.mdn = (function () {

// https://developer.mozilla.org/Special:Tags?tag=DOM
//these may only work in Chrome, but who cares?
//an array of DOM objects mdn has special links for
var DOMParts = [
	{
		name  : 'node',
		mdn   : 'Node',
		proto : Node.prototype
	},
	{
		name  : 'element',
		proto : Element.prototype
	},
	{
		name  : 'nodelist',
		mdn   : 'NodeList',
		proto : NodeList.prototype
	},
	{
		name  : 'form',
		//I could not find a way to get an actual copy of HTMLFormCollection
		// with all the properties (elements, name, acceptCharset etc) in it
		//document.createElement('form') is close, but also responds to many
		// other properties
		proto : {
			elements : true, name : true, acceptCharset : true, action : true,
			enctype : true, encoding : true, method : true, submit : true,
			reset : true, length : true, target : true
		}
	},
	{
		name  : 'document',
		proto : document
	},
	{
		name  : 'text',
		mdn   : 'Text',
		proto : Text.prototype
	}
];

function whichDOMPart ( suspect, prop ) {
	var part;
	suspect = suspect.toLowerCase();
	for ( var i = 0, len = DOMParts.length; i < len; ++i ) {
		part = DOMParts[ i ];
		if ( part.name === suspect && part.proto.hasOwnProperty(prop) ) {
			return DOMParts[ i ];
		}
	}
}

function mdn ( what ) {
	var parts = what.trim().split( '.' ),
		base = 'https://developer.mozilla.org/en/',
		url;

	bot.log( what, parts, '/mdn input' );

	//mdn urls never have something.prototype.property, but always
	// something.property
	if ( parts[1] === 'prototype' ) {
		parts.splice( 1, 1 );
	}

	//part of the DOM?
	var DOMPart = whichDOMPart( parts[0], parts[1] );
	if ( DOMPart ) {
		parts[ 0 ] = DOMPart.mdn || DOMPart.name;
		url = base + 'DOM/' + parts.join( '.' );

		bot.log( url, '/mdn DOM' );
	}

	//it may be documented as part of the global object
	else if ( window[parts[0]] ) {
		url = base +
			'JavaScript/Reference/Global_Objects/' + parts.join( '/' );
		bot.log( url, '/mdn global' );
	}

	//i unno
	else {
		url = 'https://developer.mozilla.org/en-US/search?q=' +
			encodeURIComponent( what );
		bot.log( url, '/mdn unknown' );
	}

	return url;
}

return function ( args ) {
	return args.parse().map( mdn ).join( ' ' );
};
}());

commands.get = (function () {

var types = {
	answer : true,
	question : true
};
var ranges = {
	//the result array is in descending order, so it's "reversed"
	first : function ( arr ) {
		return arr[ arr.length - 1 ];
	},

	last : function ( arr ) {
		return arr[ 0 ];
	},

	between : function ( arr ) {
		//SO api takes care of this for us
		return arr;
	}
};

return function ( args, cb ) {
	var parts = args.parse(),
		type = parts[ 0 ] || 'answer',
		plural = type + 's',

		range = parts[ 1 ] || 'last',

		usrid = parts[ 2 ];

	//if "between" is given, fetch the correct usrid
	// /get type between start end usrid
	if ( range === 'between' ) {
		usrid = parts[ 4 ];
	}

	//range is a number and no usrid, assume the range is the usrid, and
	// default range to last
	// /get type usrid
	if ( !usrid && !isNaN(range) ) {
		usrid = range;
		range = 'last';
	}

	//if after all this usrid is falsy, assume the user's id
	if ( !usrid ) {
		usrid = args.get( 'user_id' );
	}

	bot.log( parts, 'get input' );

	if ( !types.hasOwnProperty(type) ) {
		return 'Invalid "getter" name ' + type;
	}
	if ( !ranges.hasOwnProperty(range) ) {
		return 'Invalid range specifier ' + range;
	}

	var url = 'http://api.stackoverflow.com/1.1/users/' + usrid + '/' + plural,
		params = {
			sort : 'creation'
		};

	bot.log( url, params, '/get building url' );

	if ( range === 'between' ) {
		params.fromdate = Date.parse( parts[2] );
		params.todate = Date.parse( parts[3] );

		bot.log( url, params, '/get building url between' );
	}

	IO.jsonp({
		url : url,
		data : params,
		fun : parseResponse
	});

	function parseResponse ( respObj ) {
		//Une erreru! L'horreur!
		if ( respObj.error ) {
			args.reply( respObj.error.message );
			return;
		}

		//get only the part we care about in the result, based on which one
		// the user asked for (first, last, between)
		//respObj will have an answers or questions property, based on what we
		// queried for, in array form
		var relativeParts = [].concat( ranges[range](respObj[plural]) ),
			base = "http://stackoverflow.com/q/",
			res;

		bot.log( relativeParts.slice(), '/get parseResponse parsing' );

		if ( relativeParts[0] ) {
			//get the id(s) of the answer(s)/question(s)
			res = relativeParts.map(function ( obj ) {
				return base + ( obj[type + '_id'] || '' );
			}).join( ' ' );
		}
		else {
			res = 'User did not submit any ' + plural;
		}
		bot.log( res, '/get parseResponse parsed');

		if ( cb && cb.call ) {
			cb( res );
		}
		else {
			args.directreply( res );
		}
	}
};
}());
commands.get.async = true;



var descriptions = {
	help : 'Fetches documentation for given command, or general help article.' +
		' /help [cmdName]',

	listen : 'Forwards the message to the listen API (as if called without' +
		'the /)',

	live : 'Resurrects the bot if it\'s down',

	die  : 'Kills the bot',

	forget : 'Forgets a given command. `/forget cmdName`',

	ban : 'Bans a user from using a bot. `/ban usr_id|usr_name`',

	unban : 'Removes a user from bot\'s mindjail. `/unban usr_id|usr_name`',

	regex : 'Executes a regex against text input. `/regex text regex [flags]`',

	jquery : 'Fetches documentation link from jQuery API. `/jquery what`',

	choose : '"Randomly" choose an option given. `/choose option0 option1 ...`',

	user : 'Fetches user-link for specified user. `/user usr_id|usr_name`',

	listcommands : 'This seems pretty obvious',

	define : 'Fetches definition for a given word. `/define something`',

	norris : 'Random chuck norris joke!',

	urban : 'Fetches UrbanDictionary definition. `/urban something`',

	parse : 'Returns result of "parsing" message according to the bot\'s mini' +
		'-macro capabilities',

	tell : 'Redirect command result to user/message.' +
		' /tell `msg_id|usr_name cmdName [cmdArgs]`',

	mdn : 'Fetches mdn documentation. `/mdn what`',

	get : '', //I can't intelligibly explain this in a sentence

	learn : 'Teach the bot a command.' +
		' '
};

Object.keys( commands ).forEach(function ( cmdName ) {
	bot.addCommand({
		name : cmdName,
		fun  : commands[ cmdName ],
		permissions : {
			del : 'NONE'
		},
		description : descriptions[ cmdName ],
		async : commands[ cmdName ].async
	});
});

//only allow specific users to use certain commands
[ 'die', 'live', 'ban', 'unban' ].forEach(function ( cmdName ) {
	bot.commands[ cmdName ].permissions.use = bot.owners;
});

}());
