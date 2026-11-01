pub fn decode_uri_path(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3]).unwrap_or("");
            if let Ok(byte) = u8::from_str_radix(hex, 16) {
                output.push(byte);
                index += 3;
                continue;
            }
        }
        output.push(bytes[index]);
        index += 1;
    }
    String::from_utf8_lossy(&output).into_owned()
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 0,
    }
}

pub fn parse_deletion_date(value: &str) -> i64 {
    let Some((date, time)) = value.split_once('T') else {
        return 0;
    };
    let date: Vec<_> = date
        .split('-')
        .filter_map(|part| part.parse::<i64>().ok())
        .collect();
    let time: Vec<_> = time
        .split(':')
        .filter_map(|part| part.parse::<i64>().ok())
        .collect();
    let ([year, month, day], [hour, minute, second]) = (date.as_slice(), time.as_slice()) else {
        return 0;
    };
    if !(1..=12).contains(month)
        || *day < 1
        || *day > days_in_month(*year, *month)
        || !(0..=23).contains(hour)
        || !(0..=59).contains(minute)
        || !(0..=60).contains(second)
    {
        return 0;
    }
    let shifted = year - i64::from(*month <= 2);
    let era = if shifted >= 0 { shifted } else { shifted - 399 } / 400;
    let year_of_era = shifted - era * 400;
    let month_prime = if *month > 2 { month - 3 } else { month + 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    (era * 146097 + day_of_era - 719468) * 86400 + hour * 3600 + minute * 60 + second
}
