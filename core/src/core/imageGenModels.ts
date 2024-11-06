export enum ImageGenModel {
    TogetherAI = "TogetherAI",
    Dalle = "Dalle",
}

export const imageGenModels = {
    [ImageGenModel.TogetherAI]: {
        steps: 4,
        subModel: "black-forest-labs/FLUX.1-schnell",
    },
    [ImageGenModel.Dalle]: {
        steps: 0,
        subModel: "dall-e-3",
    },
};

export function getImageGenModel(model: ImageGenModel) {
    return imageGenModels[model];
}
