globals
  array studioSelectors
  array studioTables
endglobals

function SelectorTabClick takes event e returns nothing
  call ForEach(studioSelectors, j => RemoveClass('border-b-2', 'border-white'))
  call AddClass(this, ['border-b-2', 'border-white'])
  call ForEach(studioTables, j => AddClass(j, 'hidden'))
  call RemoveClass(QuerySelector(`table[id="${this.textContent}"]`), 'hidden')
endfunction

function Main takes nothing returns nothing
  set studioSelectors = QuerySelectorAll('.studio-selector')
  set studioTables = QuerySelectorAll('table')

  local integer i = 0
  local element el = null

  loop
    exitwhen i >= 10

    call AddEventListener(studioSelectors[i], 'click', function SelectorTabClick)

    set i = i + 1
  endloop

  local object o = {
    a = 'test',
    b = 10
  }
endfunction
