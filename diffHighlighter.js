//-------------
// Originally from https://github.com/pieter/gitx
// (C) Some rights reserved. GPL v2. Pieter de Bie 
	var content = diff.escapeHTML().replace(/\t/g, "    ");
		if (!file_index) {
		
		if (startname == "/dev/null") {
		}
		else if (startname != endname) {
		// If there's a diff or a binary file that hasn't been deleted, we'll make an element
		if (diffContent != "" || (binary && endname != "/dev/null")) {
			finalContent += '<div class="file" id="file_index_' + (file_index - 1) + '">' +
							'<div class="fileHeader">' + title + '</div>';
				
				finalContent += "<div>Binary file differs</div>";			}
			else {
				finalContent +=	 '<div class="diffContent">' + diffContent + '</div>';
			
		}
		// reset bookkeeping
		
		// next up
		file_index++;
	
		if (firstChar == "d" && l.charAt(1) == "i") { // "diff", i.e. new file, we have to reset everything
			// diff always starts with a header
			header = true;
			// finish previous file ?
			diffContent += "</table>";
			
			finishContent();
			
			diffContent = "<table>";
			
			// there are cases when we need to capture filenames from
			// the diff line, like with mode-changes.
			// this can get overwritten later if there is a diff or if
			// the file is binary
			if(match = l.match(/^diff --git (a\/)+(.*) (b\/)+(.*)$/)) {	
				startname = match[2];
				endname = match[4];
			}
		
				
			diffContent += "<tr>";
			diffContent += "<td class='lineno'>" + " " + "</td>";
			diffContent += "<td class='lineno'>" + ++hunk_start_line_2 + "</td>";
			diffContent += "<td " + sindex + "class='addline'>" + l + "</td>";
			diffContent += "</tr>";
		}
		else if (firstChar == "-") {
			diffContent += "<tr>";
			diffContent += "<td class='lineno'>" + ++hunk_start_line_1 + "</td>";
			diffContent += "<td class='lineno'>" + " " + "</td>";
			diffContent += "<td " + sindex + "class='delline'>" + l + "</td>";
			diffContent += "</tr>";
		}
		else if (firstChar == "@") {
			
			header = false;
			
			if (m = l.match(/@@ \-([0-9]+),?\d* \+(\d+),?\d* @@/)) {
			
			diffContent += "<tr>";
			diffContent += "<td class='lineno'>" + "..." + "</td>";
			diffContent += "<td class='lineno'>" + "..." + "</td>";
			diffContent += "<td " + sindex + "class='hunkheader'>" + l + "</td>";
			diffContent += "</tr>";
		else if (firstChar == " ") {
			diffContent += "<tr>";
			diffContent += "<td class='lineno'>" + ++hunk_start_line_1 + "</td>";
			diffContent += "<td class='lineno'>" + ++hunk_start_line_2 + "</td>";
			diffContent += "<td " + sindex + "class='noopline'>" + l + "</td>";
			diffContent += "</tr>";
		}
		
	