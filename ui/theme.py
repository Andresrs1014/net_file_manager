THEMES = {
    "dark": {
        "bg_primary":    "#1e1f22",
        "bg_secondary":  "#2b2d31",
        "bg_hover":      "#35373c",
        "bg_selected":   "#404249",
        "accent":        "#e53935",
        "accent_hover":  "#ef5350",
        "text_primary":  "#f2f3f5",
        "text_secondary":"#949ba4",
        "border":        "#1e1f22",
        "toolbar":       "#111214",
        "tag_folder":    "#5865f2",
        "tag_file":      "#949ba4",
    },
    "light": {
        "bg_primary":    "#ffffff",
        "bg_secondary":  "#f5f5f5",
        "bg_hover":      "#ffebee",
        "bg_selected":   "#ffcdd2",
        "accent":        "#e53935",
        "accent_hover":  "#c62828",
        "text_primary":  "#1a1a1a",
        "text_secondary":"#757575",
        "border":        "#e0e0e0",
        "toolbar":       "#f5f5f5",
        "tag_folder":    "#1565c0",
        "tag_file":      "#424242",
    }
}

def get_theme(name: str) -> dict:
    return THEMES.get(name, THEMES["dark"])
