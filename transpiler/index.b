function checkActive(element)
    local location = window.location.origin + window.location.pathname

    if GetAttribute(element.parentElement, "href") == location then
        call AddClass(element, "sidebar__item--active")
    end
end

function checkSubitemActive(element)
    if GetAttribute(element, "href") == window.location.href then
        call AddClass(element, "sidebar__item--active")
        call ToggleClass(element.parentElement, "d-none")
    end
end

function addSvgToggle(element)
    call OnClick(element, function()
        call ToggleClass(this.querySelector(".sidebar__subitem-wrapper"), "d-none")
        call ToggleClass(this.querySelector(".collapsed-item-svg"), "d-none")
        call ToggleClass(this.querySelector(".expanded-item-svg"), "d-none")
    end)
end

function main()
    set test[a] = !test[a]

    call ForEach(document.querySelectorAll(".sidebar__item"), function checkActive)
    call ForEach(document.querySelectorAll(".sidebar__subitem"), function checkSubitemActive)
    call ForEach(document.querySelectorAll(".sidebar__list-wrapper"), function addSvgToggle)
end

call OnReady(function main)
