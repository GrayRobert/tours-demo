SELECT
	DISTINCT
	h.code AS hotel_code,
	h.name AS hotel_name,
	h.stars AS hotel_start_rating,
	(SELECT * FROM get_tour_name_for_hotel(h.code)) AS "tour",
	chp.seo_description AS "description",
	jpc.travel_date AS "date",
	'https://res-2.cloudinary.com/holiday-images/image/upload/q_auto:eco,f_auto,dpr_auto,w_600,h_400,c_fill,q_auto:eco,f_auto/' || REGEXP_REPLACE((SELECT DISTINCT secure_path FROM images WHERE images.code = h.code LIMIT 1), '^/', '') AS "image_url",
	'€1,299' AS price_from,
	(ARRAY['relaxed', 'leisurely', 'moderate', 'active', 'challenging'])[floor(random() * 5)::int + 1] AS tour_activity_level,
	pv.breadcrumb AS visiting,
	CASE WHEN (SELECT * FROM get_tour_name_for_hotel(h.code)) ILIKE '%FRENCH%' THEN 'France' ELSE split_part(pv.breadcrumb, ',', 1) END AS country,
	jpc.duration AS "duration",
	'TBC' AS url_path
FROM
	hotel h
LEFT JOIN hotel_holiday_type htt ON
	h.code = htt.hotel_code
	AND htt.holiday_type_code = 10
LEFT JOIN java_price_cache jpc ON jpc.hotel = h.code
LEFT JOIN cms_hotel_page chp ON chp.hotel = h.code AND chp.product_code = 'TFS'
LEFT JOIN place p ON h.parent = p.id
LEFT JOIN places_view pv ON p.id = pv.place_id
WHERE (SELECT * FROM get_tour_name_for_hotel(h.code)) NOTNULL AND jpc.hotel NOTNULL AND jpc.duration <> 14;