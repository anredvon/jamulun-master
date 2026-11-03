# 손금 콘텐츠 출처 및 편집 메모

초기 자료는 손금 전통의 표현을 조사하는 역사 자료다. 손금이 건강, 수명, 성격, 재물 또는 미래를 알아낸다는 과학적 근거로 사용하지 않는다. 앱 문구는 원문을 길게 복사하지 않고 한국어로 새로 편집한다. 출처마다 같은 선의 이름이나 해석이 다르면 합쳐서 보편적 사실처럼 쓰지 않는다.

## 조사한 공개 원문

| Source key | 서지 정보 | 참고 범위 | 이용 조건 메모 |
| --- | --- | --- | --- |
| `key-to-palmistry-1902` | Louis Williams, [*Key to Palmistry* (1902)](https://www.gutenberg.org/files/79203/79203-h/79203-h.htm) · [Library of Congress record](https://www.loc.gov/item/02009990/) | 생명선 p.17, 감정선 p.18, 두뇌선 p.19, 선의 교차 p.20 | Library of Congress는 디지털 자료를 public domain으로 표시한다. Project Gutenberg 판본은 미국 내 public domain으로 표시한다. 한국 상업 서비스 사용 전 현지 법과 판본별 조건을 확인한다. |
| `indian-palmistry-1895` | J. B. Dale, [*Indian Palmistry* (1895)](https://www.gutenberg.org/ebooks/52523) | 선 목록 및 생명선/두뇌선/운명선 설명, 전자 텍스트 39–47쪽 | Project Gutenberg는 미국 내 public domain으로 표시한다. 저자·출판 맥락은 빅토리아 시대 영문 출판물이므로 인도 손금 전통 전체를 대표한다고 표시하지 않는다. |
| `palmistry-for-all-1916` | Cheiro, [*Palmistry for All* (1916)](https://www.gutenberg.org/ebooks/20480) | 생명선 pp.39–40, 운명선 pp.47–56, 주요 선 판 도해 | Project Gutenberg는 미국 내 public domain으로 표시한다. 한국 상업 서비스 사용 전 현지 법과 판본별 조건을 확인한다. |

## 편집 기준

- 인쇄본의 운세적 예측은 앱 문구에 옮기지 않는다.
- 수명, 질병, 임신, 죽음, 범죄성, 빈곤, 투자·재물 결과를 선 모양으로 판단하는 항목은 제외한다.
- 안전하게 남길 수 있는 내용은 선의 전통적 이름/위치, 전통에서 붙여 온 상징, 부담 없는 성찰 질문으로 제한한다.
- 결과는 관찰 사실(예: “엄지 밑을 감싸는 선이 보임”)과 전통 풀이(예: “옛 손금에서는 활력의 상징으로 읽음”)를 별도 문장으로 표시한다.
- 식별 신뢰도가 낮으면 풀이를 만들어내지 않고 “사진에서 판독하기 어려움”을 보여준다.
- 손금 해석 규칙은 출처 위치·표현 범위·안전한 문구를 편집 검토한 뒤 승인된 규칙만 `is_active`로 게시한다. 과학적 근거가 있는 분석으로 표현하지 않는다.

## 초기 풀이 초안

초기 6개 풀이 규칙은 `static/data/palm-reading-rules.json`에 있으며, 모두 원문 위치를 대조하고 건강·수명·재물·미래 단정을 제외한 뒤 승인했다. 이 파일은 DB import 원본이자 검토 가능한 관리용 자료다. 등록은 다음 명령으로 멱등 실행한다.

```sh
python scripts/seed_palm_readings.py
```

이 명령은 `PalmSource` 및 `PalmReadingRule` 테이블을 생성하고 초안을 등록/갱신한다. 기존 사용자 세션·결과와 퀴즈 데이터는 수정하거나 지우지 않는다.

## 사진 판독 및 검증 범위

- 로컬 MediaPipe Hand Landmarker 모델은 손 관절 위치를 검출하지만 손바닥 면과 손등 면을 확정 분류하지 않는다. 손바닥 주름이 보이지 않으면 재촬영을 안내한다.
- 사용자가 제공한 IMG_4175.JPG 한 장을 로컬 브라우저에서 확인했다. 손 랜드마크를 찾았고 감정선과 운명선 후보를 얻었으며, 두뇌선·생명선은 불확실로 남겼다. 이것은 판독 정확도 검증이 아니다.
- 잘린 사진, 손이 아닌 사진, 손등, 흐림/저조도 등 대조군 검증은 별도로 필요하다. 모델 카드도 실사용 환경 전체에 대한 검증을 보장하지 않는다. [Google MediaPipe Hand Landmarker](https://developers.google.cn/edge/mediapipe/solutions/vision/hand_landmarker/index) · [model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf)
