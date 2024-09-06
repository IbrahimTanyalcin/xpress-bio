
const animations = {
    fadeInUp: (options = {}) => [[
        {
            opacity: 0,
            "-webkit-transform": "translate3d(0, 100%, 0)",
            transform: "translate3d(0, 100%, 0)"
        },
        {
            opacity: 1,
            "-webkit-transform": "translateZ(0)",
            transform: "translateZ(0)"
        }
    ], options],
    fadeOutUp: (options = {}) => [[
        {
            opacity: 1
        },
        {
            opacity: 0,
            "-webkit-transform": "translate3d(0, -100%, 0)",
            transform: "translate3d(0, -100%, 0)"
        }
    ], options]
}

export const {fadeInUp, fadeOutUp} = animations;