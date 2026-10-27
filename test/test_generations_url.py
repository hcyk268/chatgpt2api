from test.utils import post_json


def main() -> None:
    result = post_json(
        "/v1/images/generations",
        {
            "prompt": "An orange cat by the window in afternoon sunlight, realistic photo",
            "model": "gpt-image-2",
            "n": 1,
            "response_format": "url",
        },
    )
    for item in result.get("data", []):
        print(item.get("url", ""))


if __name__ == "__main__":
    main()
