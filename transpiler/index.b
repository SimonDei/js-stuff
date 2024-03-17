globals

endglobals

function copyLinkHandler takes integer age returns nothing
  local string canDrive = do
    if age >= 18 then
      return "You can drive"
    else
      return "You can't drive"
    endif
  enddo

  return canDrive
endfunction

local object mailTo = call QuerySelector("#mailto-link")
local object saveFavorite = call QuerySelector("#save-favorite-button")
local object copyLink = call QuerySelector("#copy-link")

// Testkommentar - DIes ist ein test

call SetAttr(mailTo, "href", "mailto:?subject=" + "Hallo Welt")

call OnClick(saveFavorite, function takes nothing returns nothing
  call Fetch("/api/favorite_links/create")
endfunction)

call OnClick(copyLink, function takes nothing returns nothing
  call await WriteClipboard(document->location->href)
  call Alert("Link wurde kopiert!")
endfunction)

call OnClick(copyLink, function copyLinkHandler)

local object counter = call QuerySelector("#count")

call OnClick("#add", function takes nothing returns nothing
  local string count = call GetText(counter)
  set count = call S2I(count)

endfunction)
