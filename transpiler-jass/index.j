globals
  array selectors
  array tables
endglobals

function SelectorTabClick takes event e returns nothing
  call ForEach(selectors, j => RemoveClass('border-b-2', 'border-white'))
  call AddClass(this, ['border-b-2', 'border-white'])
  call ForEach(tables, j => AddClass(j, 'hidden'))
  call RemoveClass(QuerySelector(`table[id="${this.textContent}"]`), 'hidden')
endfunction

function Main takes nothing returns nothing
  set selectors = QuerySelectorAll('.selectors')
  set tables = QuerySelectorAll('table')

  local integer i = 0
  local element el = null

  loop
    exitwhen i >= 10

    call AddEventListener(selectors[i], 'click', function SelectorTabClick)

    set i = i + 1
  endloop

  local object o = {
    a = 'test',
    b = 10
  }
endfunction
