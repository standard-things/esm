"use strict";let count = 0;

// This default expression will evaluate to 0 if the parentheses are
// mistakenly stripped away.
module.exportDefault((count++, count));
